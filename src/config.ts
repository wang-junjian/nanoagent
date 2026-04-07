import type { Config } from './types.js'
import { getSystemPrompt } from './context/index.js'

// ============= 配置 =============
export const CONFIG: Config = {
  baseURL: process.env.BASE_URL || 'http://localhost:11434/',
  apiKey: process.env.API_KEY || 'NONE',
  model: process.env.MODEL || 'qwen3.5:9b',
  maxTokens: parseInt(process.env.MAX_TOKENS || '256000', 10),
} as const

// 简单模式标志
export const SIMPLE_MODE = process.env.CLAUDE_CODE_SIMPLE === 'true'

/**
 * 获取系统提示词
 * 使用新的上下文管理系统
 */
export function getSystemPromptForConfig(): string {
  return getSystemPrompt({ simpleMode: SIMPLE_MODE })
}

// 为了向后兼容，仍然导出 SYSTEM_PROMPT
export const SYSTEM_PROMPT = getSystemPromptForConfig()
