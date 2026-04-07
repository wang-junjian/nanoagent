/**
 * 上下文管理器 - 参考 Claude Code 架构
 *
 * 管理消息历史、上下文窗口、消息压缩等功能
 */

import type { Message } from '../types.js'
import { logger } from '../logger.js'

// ========== 配置常量 ==========
const DEFAULT_CONTEXT_WINDOW_TOKENS = 256000
const AUTO_COMPACT_THRESHOLD_TOKENS = DEFAULT_CONTEXT_WINDOW_TOKENS - 13000
const WARNING_THRESHOLD_TOKENS = 20000

// 粗略的令牌估算（字符数 / 4）
const ESTIMATED_CHARS_PER_TOKEN = 4

// ========== 上下文状态 ==========
export interface ContextStats {
  totalMessages: number
  estimatedTokens: number
  systemMessageTokens: number
  userMessages: number
  assistantMessages: number
  toolMessages: number
  contextUtilization: number // 0-1
}

// ========== 压缩结果 ==========
export interface CompactionResult {
  success: boolean
  messagesRemoved: number
  tokensSaved: number
  strategy: string
  summary?: string
}

// ========== 上下文管理器类 ==========
export class ContextManager {
  private messages: Message[] = []
  private systemMessage: Message | null = null
  private maxTokens: number
  private autoCompactThreshold: number
  private warningThreshold: number

  constructor(options: {
    maxTokens?: number
    autoCompactThreshold?: number
    warningThreshold?: number
  } = {}) {
    this.maxTokens = options.maxTokens || DEFAULT_CONTEXT_WINDOW_TOKENS
    this.autoCompactThreshold = options.autoCompactThreshold || AUTO_COMPACT_THRESHOLD_TOKENS
    this.warningThreshold = options.warningThreshold || WARNING_THRESHOLD_TOKENS
  }

  /**
   * 设置系统提示词
   */
  setSystemMessage(message: Message): void {
    if (message.role !== 'system') {
      throw new Error('System message must have role "system"')
    }
    this.systemMessage = message
  }

  /**
   * 获取系统提示词
   */
  getSystemMessage(): Message | null {
    return this.systemMessage
  }

  /**
   * 添加消息
   */
  addMessage(message: Message): void {
    this.messages.push(message)
    logger.debug('Message added', {
      role: message.role,
      length: message.content.length,
      totalMessages: this.messages.length
    })
  }

  /**
   * 批量添加消息
   */
  addMessages(messages: Message[]): void {
    this.messages.push(...messages)
    logger.debug('Messages added', {
      count: messages.length,
      totalMessages: this.messages.length
    })
  }

  /**
   * 获取所有消息（包括系统消息）
   */
  getMessages(): Message[] {
    const result: Message[] = []
    if (this.systemMessage) {
      result.push(this.systemMessage)
    }
    result.push(...this.messages)
    return result
  }

  /**
   * 获取对话历史（不包括系统消息）
   */
  getHistory(): Message[] {
    return [...this.messages]
  }

  /**
   * 清空历史，但保留系统消息
   */
  clearHistory(): void {
    const oldCount = this.messages.length
    this.messages = []
    logger.info('History cleared', { messagesRemoved: oldCount })
  }

  /**
   * 获取上下文统计信息
   */
  getStats(): ContextStats {
    let userMessages = 0
    let assistantMessages = 0
    let toolMessages = 0
    let totalChars = 0

    for (const msg of this.messages) {
      totalChars += msg.content.length
      switch (msg.role) {
        case 'user': userMessages++; break
        case 'assistant': assistantMessages++; break
        case 'tool': toolMessages++; break
      }
    }

    const systemTokens = this.systemMessage
      ? Math.ceil(this.systemMessage.content.length / ESTIMATED_CHARS_PER_TOKEN)
      : 0

    const historyTokens = Math.ceil(totalChars / ESTIMATED_CHARS_PER_TOKEN)
    const estimatedTokens = systemTokens + historyTokens

    return {
      totalMessages: this.messages.length,
      estimatedTokens,
      systemMessageTokens: systemTokens,
      userMessages,
      assistantMessages,
      toolMessages,
      contextUtilization: estimatedTokens / this.maxTokens
    }
  }

  /**
   * 检查是否需要自动压缩
   */
  needsAutoCompact(): boolean {
    const stats = this.getStats()
    return stats.estimatedTokens >= this.autoCompactThreshold
  }

  /**
   * 检查是否接近上下文限制
   */
  isNearLimit(): boolean {
    const stats = this.getStats()
    const remaining = this.maxTokens - stats.estimatedTokens
    return remaining <= this.warningThreshold
  }

  /**
   * 获取剩余可用令牌数
   */
  getRemainingTokens(): number {
    const stats = this.getStats()
    return Math.max(0, this.maxTokens - stats.estimatedTokens)
  }

  // ========== 压缩策略 ==========

  /**
   * 简单压缩策略：删除最早的消息
   */
  compactByTruncation(keepCount: number = 10): CompactionResult {
    if (this.messages.length <= keepCount) {
      return {
        success: false,
        messagesRemoved: 0,
        tokensSaved: 0,
        strategy: 'truncation'
      }
    }

    const removed = this.messages.splice(0, this.messages.length - keepCount)
    const tokensSaved = this.estimateMessagesTokens(removed)

    logger.info('Context compacted by truncation', {
      messagesRemoved: removed.length,
      tokensSaved
    })

    return {
      success: true,
      messagesRemoved: removed.length,
      tokensSaved,
      strategy: 'truncation'
    }
  }

  /**
   * 压缩工具结果：只保留工具结果的前 N 个字符
   */
  compactToolResults(maxLength: number = 500): CompactionResult {
    let tokensSaved = 0
    let modifiedCount = 0

    for (let i = 0; i < this.messages.length; i++) {
      const msg = this.messages[i]
      if (msg.role === 'tool' && msg.content.length > maxLength) {
        const originalLength = msg.content.length
        const summary = `[工具结果已截断，原文 ${originalLength} 字符]\n\n`
        this.messages[i] = {
          ...msg,
          content: summary + msg.content.slice(0, maxLength)
        }
        tokensSaved += Math.ceil((originalLength - this.messages[i].content.length) / ESTIMATED_CHARS_PER_TOKEN)
        modifiedCount++
      }
    }

    if (modifiedCount === 0) {
      return {
        success: false,
        messagesRemoved: 0,
        tokensSaved: 0,
        strategy: 'tool-results'
      }
    }

    logger.info('Tool results compacted', {
      modifiedCount,
      tokensSaved
    })

    return {
      success: true,
      messagesRemoved: 0,
      tokensSaved,
      strategy: 'tool-results'
    }
  }

  /**
   * 折叠连续的工具调用组
   */
  collapseToolGroups(): CompactionResult {
    const newMessages: Message[] = []
    let currentToolGroup: Message[] = []
    let collapsedCount = 0

    for (const msg of this.messages) {
      if (msg.role === 'tool') {
        currentToolGroup.push(msg)
      } else {
        if (currentToolGroup.length > 1) {
          // 折叠多个连续的工具结果
          const summary = this.summarizeToolGroup(currentToolGroup)
          newMessages.push(summary)
          collapsedCount += currentToolGroup.length - 1
        } else if (currentToolGroup.length === 1) {
          newMessages.push(currentToolGroup[0])
        }
        currentToolGroup = []
        newMessages.push(msg)
      }
    }

    // 处理剩余的工具消息
    if (currentToolGroup.length > 1) {
      const summary = this.summarizeToolGroup(currentToolGroup)
      newMessages.push(summary)
      collapsedCount += currentToolGroup.length - 1
    } else if (currentToolGroup.length === 1) {
      newMessages.push(currentToolGroup[0])
    }

    if (collapsedCount === 0) {
      return {
        success: false,
        messagesRemoved: 0,
        tokensSaved: 0,
        strategy: 'collapse-tool-groups'
      }
    }

    const tokensSaved = this.estimateMessagesTokens(this.messages) - this.estimateMessagesTokens(newMessages)
    this.messages = newMessages

    logger.info('Tool groups collapsed', {
      collapsedCount,
      tokensSaved
    })

    return {
      success: true,
      messagesRemoved: collapsedCount,
      tokensSaved,
      strategy: 'collapse-tool-groups'
    }
  }

  /**
   * 自动压缩：应用多种策略直到腾出足够空间
   */
  autoCompact(): CompactionResult {
    const statsBefore = this.getStats()

    if (!this.needsAutoCompact()) {
      return {
        success: false,
        messagesRemoved: 0,
        tokensSaved: 0,
        strategy: 'none'
      }
    }

    logger.info('Starting auto-compaction', {
      beforeTokens: statsBefore.estimatedTokens,
      threshold: this.autoCompactThreshold
    })

    // 策略 1: 先尝试折叠工具组
    let result = this.collapseToolGroups()
    if (result.success && !this.needsAutoCompact()) {
      return result
    }

    // 策略 2: 压缩工具结果
    result = this.compactToolResults(300)
    if (result.success && !this.needsAutoCompact()) {
      return result
    }

    // 策略 3: 截断早期消息
    result = this.compactByTruncation(20)
    if (result.success && !this.needsAutoCompact()) {
      return result
    }

    // 策略 4: 更激进的截断
    result = this.compactByTruncation(10)

    const statsAfter = this.getStats()
    logger.info('Auto-compaction complete', {
      beforeTokens: statsBefore.estimatedTokens,
      afterTokens: statsAfter.estimatedTokens,
      tokensSaved: statsBefore.estimatedTokens - statsAfter.estimatedTokens
    })

    return result
  }

  // ========== 内部辅助方法 ==========

  private estimateMessagesTokens(messages: Message[]): number {
    const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0)
    return Math.ceil(totalChars / ESTIMATED_CHARS_PER_TOKEN)
  }

  private summarizeToolGroup(messages: Message[]): Message {
    const toolNames = [...new Set(messages.map(m => m.name || 'unknown'))]
    const summary = `[已折叠 ${messages.length} 个工具结果: ${toolNames.join(', ')}]`

    return {
      role: 'tool',
      content: summary,
      name: 'collapsed'
    }
  }
}

// ========== 便捷函数 ==========

/**
 * 估算消息的令牌数（粗略估算）
 */
export function estimateTokens(content: string): number {
  return Math.ceil(content.length / ESTIMATED_CHARS_PER_TOKEN)
}

/**
 * 创建默认的上下文管理器
 */
export function createContextManager(systemPrompt?: string): ContextManager {
  const manager = new ContextManager()
  if (systemPrompt) {
    manager.setSystemMessage({
      role: 'system',
      content: systemPrompt
    })
  }
  return manager
}
