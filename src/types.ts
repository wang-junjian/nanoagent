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

export interface ToolResult {
  content: string
  newMessages?: Message[]
}

export interface ToolDefinition {
  name: string
  description: string
  params: Record<string, ToolParam>
  execute: (args: Record<string, any>) => Promise<string | ToolResult>
}

export interface Config {
  baseURL: string
  apiKey: string
  model: string
  maxTokens: number
}

// ============= Skill 类型 =============

export interface SkillFrontmatter {
  name?: string
  description?: string
  'allowed-tools'?: string[] | string
  'when-to-use'?: string
  model?: string
  'user-invocable'?: boolean | string
}

/**
 * 内置技能定义
 */
export interface BundledSkillDefinition {
  name: string
  description: string
  whenToUse?: string
  allowedTools?: string[]
  model?: string
  userInvocable?: boolean
  getPrompt: (args: string) => string
}

export interface SkillDefinition {
  name: string
  description: string
  content: string
  frontmatter: SkillFrontmatter
  allowedTools: string[]
  whenToUse?: string
  model?: string
  userInvocable: boolean
  source: string
  /** 内置技能有自定义的 getPrompt 函数 */
  getPrompt?: (args: string) => string
}

export interface SkillContext {
  skills: Map<string, SkillDefinition>
}

// ============= Command 系统类型 =============

export type CommandType = 'local' | 'prompt'

export interface CommandBase {
  name: string
  description: string
  aliases?: string[]
  isEnabled?: () => boolean
  isHidden?: boolean
  argumentHint?: string
  whenToUse?: string
}

export interface LocalCommand extends CommandBase {
  type: 'local'
  handler: (args: string[], context: CommandContext) => void | Promise<void>
}

export interface PromptCommand extends CommandBase {
  type: 'prompt'
  getPrompt: (args: string) => string | Message[] | Promise<string | Message[]>
  allowedTools?: string[]
  model?: string
}

export type Command = LocalCommand | PromptCommand

export interface CommandContext {
  agent: any  // NanoAgent 实例
  cwd: string  // 当前工作目录
  commandRegistry?: any  // CommandRegistry 实例（可选，用于某些命令的内部使用）
}
