import type { Message } from './types.js'
import { CONFIG } from './config.js'
import { logger } from './logger.js'
import { APIError, retry } from './errors.js'

// ============= OpenAI API 客户端 =============

interface ChatCompletionsRequest {
  messages: Message[]
  tools: Record<string, any>[]
}

interface ChatCompletionChoice {
  message: {
    content: string | null
    role: string
    tool_calls?: Array<{
      id: string
      function: {
        name: string
        arguments: string
      }
    }>
  }
}

interface ChatCompletionsResponse {
  choices: ChatCompletionChoice[]
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * 调用 chat completions API
 * 包含错误处理和重试机制
 */
export async function chatCompletions(req: ChatCompletionsRequest): Promise<ChatCompletionsResponse> {
  return retry(
    () => callChatCompletions(req),
    3, // 最多重试 3 次
    1000, // 初始延迟 1 秒
    2, // 指数退避因子
  )
}

/**
 * 实际的 API 调用函数
 */
async function callChatCompletions(req: ChatCompletionsRequest): Promise<ChatCompletionsResponse> {
  const url = `${CONFIG.baseURL}v1/chat/completions`

  logger.debug('Calling chat completions API', {
    url,
    messageCount: req.messages.length,
    toolCount: req.tools.length,
  })

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CONFIG.apiKey}`,
    },
    body: JSON.stringify({
      model: CONFIG.model,
      max_tokens: CONFIG.maxTokens,
      messages: req.messages,
      tools: req.tools,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    logger.error('API request failed', {
      status: response.status,
      statusText: response.statusText,
      errorText: error.slice(0, 200),
    })
    throw new APIError(
      `API 请求失败: ${response.status} ${response.statusText}`,
      response.status,
      { error: error.slice(0, 500) },
    )
  }

  const data = (await response.json()) as ChatCompletionsResponse

  logger.debug('API response received', {
    choiceCount: data.choices.length,
    tokens: data.usage?.total_tokens,
  })

  return data
}
