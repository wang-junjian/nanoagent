import type { Message, ToolDefinition } from './types.js'
import { chatCompletions } from './client.js'
import { getSystemPromptForConfig, CONFIG } from './config.js'
import { toolRegistry } from './tool-system.js'
import { logger } from './logger.js'
import { ToolExecutionError } from './errors.js'
import {
  ContextManager,
  PromptAssembler,
  createContextManager
} from './context/index.js'

// ============= Agent 主类 =============
export class NanoAgent {
  private contextManager: ContextManager
  private promptAssembler: PromptAssembler

  constructor() {
    // 使用新的上下文管理系统
    const systemPrompt = getSystemPromptForConfig()
    this.contextManager = createContextManager(systemPrompt)
    this.promptAssembler = new PromptAssembler(this.contextManager)

    logger.info('NanoAgent initialized with context management system', {
      maxTokens: CONFIG.maxTokens
    })
  }

  /**
   * 获取所有消息（用于展示历史）
   */
  getMessages(): Message[] {
    return this.contextManager.getMessages()
  }

  /**
   * 获取对话历史（不包括系统消息）
   */
  getHistory(): Message[] {
    return this.contextManager.getHistory()
  }

  /**
   * 清空消息历史，但保留系统提示词
   */
  clearHistory(): void {
    this.contextManager.clearHistory()
    logger.info('History cleared')
  }

  /**
   * 获取上下文统计信息
   */
  getContextStats() {
    return this.contextManager.getStats()
  }

  /**
   * 根据工具名称查找工具
   */
  private findTool(name: string) {
    return toolRegistry.get(name)
  }

  /**
   * 主执行循环 - 生成器函数，返回流式响应
   */
  async *run(userInput: string): AsyncGenerator<string, void, unknown> {
    // 添加用户消息到上下文
    this.contextManager.addMessage({ role: 'user', content: userInput })
    logger.info('User input received', { inputLength: userInput.length })

    // 记录初始上下文状态
    const initialStats = this.contextManager.getStats()
    logger.debug('Initial context stats', initialStats)

    let iteration = 0
    const maxIterations = 10

    while (iteration < maxIterations) {
      iteration++

      yield `\n[迭代 ${iteration}/${maxIterations}]\n`

      try {
        // 使用提示词组装器获取消息（自动处理压缩）
        const assemblyResult = this.promptAssembler.assemble({
          applyCompaction: true
        })

        // 输出上下文信息
        if (assemblyResult.compacted) {
          yield `\n[上下文已压缩: ${assemblyResult.compactionInfo?.strategy}, 节省 ${assemblyResult.compactionInfo?.tokensSaved} 令牌]\n`
        }

        if (assemblyResult.warnings.length > 0) {
          for (const warning of assemblyResult.warnings) {
            yield `\n[警告: ${warning}]\n`
          }
        }

        // 记录上下文使用情况
        logger.debug('Context stats before API call', {
          tokens: assemblyResult.stats.estimatedTokens,
          messages: assemblyResult.stats.totalMessages,
          utilization: Math.round(assemblyResult.stats.contextUtilization * 100) + '%'
        })

        // 调用 API
        const response = await chatCompletions({
          messages: assemblyResult.messages,
          tools: toolRegistry.toOpenAIFormat(),
        })

        const choice = response.choices[0]
        const assistantMessage = choice.message

        // 添加助手消息到上下文
        const assistantMsg: Message = {
          role: 'assistant',
          content: assistantMessage.content || '',
        }
        this.contextManager.addMessage(assistantMsg)

        if (assistantMessage.content) {
          yield '\n' + assistantMessage.content + '\n'
        }

        const toolCalls = assistantMessage.tool_calls
        if (!toolCalls || toolCalls.length === 0) {
          logger.debug('Agent loop completed - no tool calls')
          break
        }

        // 处理工具调用
        for (const toolCall of toolCalls) {
          const tool = this.findTool(toolCall.function.name)
          if (!tool) {
            const errorMsg = `未知工具: ${toolCall.function.name}`
            yield `\n[${errorMsg}]\n`
            logger.warn('Unknown tool called', { toolName: toolCall.function.name })

            // 添加错误消息到上下文
            this.contextManager.addMessage({
              role: 'tool',
              tool_call_id: toolCall.id,
              name: toolCall.function.name,
              content: errorMsg,
            })
            continue
          }

          const args = JSON.parse(toolCall.function.arguments)
          yield `\n[调用工具: ${tool.name}(${JSON.stringify(args)})]\n`
          logger.info('Tool called', { toolName: tool.name })

          try {
            const result = await tool.executeWithErrorHandling(args)

            // 检查是否是 ToolResult（包含 newMessages）
            let content: string
            let newMessages: Message[] | undefined

            if (typeof result === 'string') {
              content = result
            } else {
              content = result.content
              newMessages = result.newMessages
            }

            yield `\n[工具结果]\n${content}\n`

            // 添加工具结果到上下文
            this.contextManager.addMessage({
              role: 'tool',
              tool_call_id: toolCall.id,
              name: tool.name,
              content,
            })

            // 处理 newMessages - 技能渐进式展开的关键
            if (newMessages && newMessages.length > 0) {
              yield `\n[展开 ${newMessages.length} 条消息]\n`
              this.contextManager.addMessages(newMessages)
            }
          } catch (error) {
            let errorMsg: string
            if (error instanceof ToolExecutionError) {
              errorMsg = `工具执行失败 (${error.code}): ${error.message}`
              logger.error('Tool execution failed', {
                toolName: tool.name,
                code: error.code,
                message: error.message,
              })
            } else {
              errorMsg = `工具执行失败: ${error instanceof Error ? error.message : String(error)}`
              logger.error('Tool execution error', {
                toolName: tool.name,
                error: errorMsg,
              })
            }

            yield `\n${errorMsg}\n`

            // 添加错误消息到上下文
            this.contextManager.addMessage({
              role: 'tool',
              tool_call_id: toolCall.id,
              name: tool.name,
              content: errorMsg,
            })
          }
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : String(error)
        logger.error('Agent loop error', { iteration, error: errorMsg })
        yield `\n[Agent 循环错误]: ${errorMsg}\n`
        break
      }
    }

    if (iteration >= maxIterations) {
      yield `\n[达到最大迭代次数 ${maxIterations}，结束]\n`
      logger.warn('Max iterations reached', { maxIterations })
    }

    // 输出最终上下文统计
    const finalStats = this.contextManager.getStats()
    logger.debug('Final context stats', finalStats)
  }
}
