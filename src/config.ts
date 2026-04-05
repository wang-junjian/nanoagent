import type { Config } from './types.js'

// ============= 配置 =============
export const CONFIG: Config = {
  baseURL: 'http://localhost:11434/',
  apiKey: 'NONE',
  model: 'qwen3.5:9b',
  maxTokens: 256000,
} as const

export const SYSTEM_PROMPT = `你是一个智能编程助手。使用可用的工具帮助用户完成软件工程任务。

# 工具使用规则
- 总是先读取文件再编辑
- 优先使用专用工具而非 Bash
- 可以并行调用多个独立工具

# 响应风格
- 简洁直接，直奔主题
- 引用代码时包含文件路径`
