/**
 * 提示词组装器 - 参考 Claude Code 架构
 *
 * 负责将系统提示词、用户上下文、消息历史组装成最终的 API 请求
 */

import type { Message } from '../types.js'
import { ContextManager, ContextStats } from './context-manager.js'
import { logger } from '../logger.js'

// ========== 组装选项 ==========
export interface PromptAssemblyOptions {
  prependUserContext?: string
  appendSystemContext?: string
  includeSystemMessage?: boolean
  maxMessages?: number
  applyCompaction?: boolean
}

// ========== 组装结果 ==========
export interface PromptAssemblyResult {
  messages: Message[]
  stats: ContextStats
  compacted: boolean
  compactionInfo?: {
    strategy: string
    messagesRemoved: number
    tokensSaved: number
  }
  warnings: string[]
}

// ========== 提示词组装器类 ==========
export class PromptAssembler {
  private contextManager: ContextManager
  private warnings: string[] = []

  constructor(contextManager: ContextManager) {
    this.contextManager = contextManager
  }

  /**
   * 组装最终的提示词消息列表
   */
  assemble(options: PromptAssemblyOptions = {}): PromptAssemblyResult {
    const {
      prependUserContext,
      appendSystemContext,
      includeSystemMessage = true,
      maxMessages,
      applyCompaction = true
    } = options

    this.warnings = []
    let compacted = false
    let compactionInfo: any = null

    // 1. 检查是否需要压缩
    if (applyCompaction && this.contextManager.needsAutoCompact()) {
      logger.info('Context needs compaction, starting auto-compact')
      const result = this.contextManager.autoCompact()
      if (result.success) {
        compacted = true
        compactionInfo = {
          strategy: result.strategy,
          messagesRemoved: result.messagesRemoved,
          tokensSaved: result.tokensSaved
        }
        logger.info('Context compacted', compactionInfo)
      }
    }

    // 2. 检查是否接近上下文限制
    if (this.contextManager.isNearLimit()) {
      const remaining = this.contextManager.getRemainingTokens()
      const warning = `接近上下文限制，剩余约 ${remaining} 令牌`
      this.warnings.push(warning)
      logger.warn(warning)
    }

    // 3. 获取基础消息列表
    let messages = this.contextManager.getMessages()

    // 4. 如果不需要系统消息，移除它
    if (!includeSystemMessage && messages.length > 0 && messages[0].role === 'system') {
      messages = messages.slice(1)
    }

    // 5. 限制消息数量
    if (maxMessages && messages.length > maxMessages) {
      const removed = messages.length - maxMessages
      messages = this.keepSystemMessageAndSlice(messages, maxMessages)
      this.warnings.push(`已截断 ${removed} 条早期消息`)
    }

    // 6. 预处理消息内容
    messages = this.normalizeMessages(messages)

    // 7. 添加用户上下文前缀
    if (prependUserContext) {
      messages = this.prependToLastUserMessage(messages, prependUserContext)
    }

    // 8. 添加系统上下文后缀
    if (appendSystemContext) {
      messages = this.appendToSystemMessage(messages, appendSystemContext)
    }

    const stats = this.contextManager.getStats()

    return {
      messages,
      stats,
      compacted,
      compactionInfo,
      warnings: [...this.warnings]
    }
  }

  /**
   * 获取当前上下文统计
   */
  getStats(): ContextStats {
    return this.contextManager.getStats()
  }

  /**
   * 获取警告列表
   */
  getWarnings(): string[] {
    return [...this.warnings]
  }

  // ========== 内部辅助方法 ==========

  /**
   * 保留系统消息并切片
   */
  private keepSystemMessageAndSlice(messages: Message[], maxCount: number): Message[] {
    if (messages.length === 0) return []

    const hasSystemMessage = messages[0].role === 'system'
    if (hasSystemMessage && maxCount > 1) {
      // 保留系统消息，然后取最新的 N-1 条消息
      return [
        messages[0],
        ...messages.slice(-(maxCount - 1))
      ]
    }
    return messages.slice(-maxCount)
  }

  /**
   * 规范化消息格式
   */
  private normalizeMessages(messages: Message[]): Message[] {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content || '',
      ...(msg.tool_call_id && { tool_call_id: msg.tool_call_id }),
      ...(msg.name && { name: msg.name })
    }))
  }

  /**
   * 在最后一条用户消息前添加内容
   */
  private prependToLastUserMessage(messages: Message[], content: string): Message[] {
    const result = [...messages]

    // 从后往前找第一条用户消息
    for (let i = result.length - 1; i >= 0; i--) {
      if (result[i].role === 'user') {
        result[i] = {
          ...result[i],
          content: content + '\n\n' + result[i].content
        }
        break
      }
    }

    return result
  }

  /**
   * 在系统消息后添加内容
   */
  private appendToSystemMessage(messages: Message[], content: string): Message[] {
    const result = [...messages]

    if (result.length > 0 && result[0].role === 'system') {
      result[0] = {
        ...result[0],
        content: result[0].content + '\n\n' + content
      }
    } else {
      // 没有系统消息，添加一个
      result.unshift({
        role: 'system',
        content: content
      })
    }

    return result
  }
}

// ========== 便捷函数 ==========

/**
 * 创建并组装提示词
 */
export function assemblePrompt(
  messages: Message[],
  systemPrompt?: string,
  options: PromptAssemblyOptions = {}
): PromptAssemblyResult {
  const manager = createContextManagerForMessages(messages, systemPrompt)
  const assembler = new PromptAssembler(manager)
  return assembler.assemble(options)
}

/**
 * 从消息列表创建上下文管理器
 */
function createContextManagerForMessages(messages: Message[], systemPrompt?: string): ContextManager {
  const manager = new ContextManager()

  // 分离系统消息和其他消息
  let systemMessage: Message | undefined
  const otherMessages: Message[] = []

  for (const msg of messages) {
    if (msg.role === 'system' && !systemMessage) {
      systemMessage = msg
    } else {
      otherMessages.push(msg)
    }
  }

  // 设置系统消息
  if (systemPrompt) {
    manager.setSystemMessage({ role: 'system', content: systemPrompt })
  } else if (systemMessage) {
    manager.setSystemMessage(systemMessage)
  }

  // 添加其他消息
  manager.addMessages(otherMessages)

  return manager
}
