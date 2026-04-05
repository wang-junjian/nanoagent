// ============= 类型定义 =============

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_call_id?: string
  name?: string
}

export interface ToolParam {
  type: 'string' | 'number' | 'boolean'
  description: string
  required?: boolean
}

export interface ToolDefinition {
  name: string
  description: string
  params: Record<string, ToolParam>
  execute: (args: Record<string, any>) => Promise<string>
}

export interface Config {
  baseURL: string
  apiKey: string
  model: string
  maxTokens: number
}
