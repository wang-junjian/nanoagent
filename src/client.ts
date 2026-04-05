import type { Message } from './types.js'
import { CONFIG } from './config.js'

// ============= 简易 OpenAI 客户端 =============
export async function chatCompletions({ messages, tools }: { messages: Message[]; tools: any[] }) {
  const response = await fetch(`${CONFIG.baseURL}v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CONFIG.apiKey}`,
    },
    body: JSON.stringify({
      model: CONFIG.model,
      max_tokens: 4096,
      messages,
      tools,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`API 请求失败: ${response.status} - ${error}`)
  }

  return response.json()
}
