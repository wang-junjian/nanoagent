/**
 * 命令系统 - 参考 Claude Code 架构
 *
 * 支持两种命令类型：
 * 1. LocalCommand - 本地执行命令（直接运行 JavaScript）
 * 2. PromptCommand - 提示词命令（扩展为 LLM 提示词）
 */

import type { Command, CommandContext, LocalCommand, PromptCommand, Message } from './types.js'
import { COLORS } from './constants/colors.js'

/**
 * 命令解析结果
 */
export interface ParsedCommand {
  name: string
  args: string
  argList: string[]
}

/**
 * 命令执行结果
 */
export interface CommandResult {
  success: boolean
  type: 'local' | 'prompt'
  output?: string
  prompt?: string | Message[]
  error?: Error
}

/**
 * 命令注册表
 */
export class CommandRegistry {
  private commands: Map<string, Command> = new Map()
  private nameToCanonical: Map<string, string> = new Map()

  /**
   * 注册一个命令
   */
  register(command: Command): void {
    const canonicalName = command.name.toLowerCase()
    this.commands.set(canonicalName, command)
    this.nameToCanonical.set(canonicalName, canonicalName)

    // 注册别名
    if (command.aliases) {
      for (const alias of command.aliases) {
        const aliasLower = alias.toLowerCase()
        this.nameToCanonical.set(aliasLower, canonicalName)
      }
    }
  }

  /**
   * 批量注册命令
   */
  registerAll(commands: Command[]): void {
    for (const command of commands) {
      this.register(command)
    }
  }

  /**
   * 获取命令
   */
  get(name: string): Command | undefined {
    const canonical = this.nameToCanonical.get(name.toLowerCase())
    if (!canonical) return undefined
    return this.commands.get(canonical)
  }

  /**
   * 检查命令是否存在
   */
  has(name: string): boolean {
    return this.nameToCanonical.has(name.toLowerCase())
  }

  /**
   * 获取所有命令
   */
  getAll(): Command[] {
    return Array.from(this.commands.values())
  }

  /**
   * 获取可见命令（过滤隐藏的命令）
   */
  getVisible(): Command[] {
    return this.getAll().filter(cmd => !cmd.isHidden)
  }

  /**
   * 搜索命令（用于自动补全）
   */
  search(partial: string): Command[] {
    const partialLower = partial.toLowerCase()
    return this.getVisible().filter(cmd =>
      cmd.name.toLowerCase().includes(partialLower) ||
      cmd.description.toLowerCase().includes(partialLower) ||
      (cmd.aliases?.some(a => a.toLowerCase().includes(partialLower)))
    )
  }
}

/**
 * 命令解析器
 */
export class CommandParser {
  /**
   * 解析斜杠命令输入
   * 格式: /commandName arg1 arg2 "arg with spaces"
   */
  static parse(input: string): ParsedCommand | null {
    const trimmed = input.trim()
    if (!trimmed.startsWith('/')) return null

    const rest = trimmed.slice(1)
    if (!rest) return null

    // 解析命令名和参数
    const parts = this.splitWithQuotes(rest)
    if (parts.length === 0) return null

    return {
      name: parts[0],
      args: parts.slice(1).join(' '),
      argList: parts.slice(1)
    }
  }

  /**
   * 带引号的字符串分割
   * 支持 "arg with spaces" 格式
   */
  private static splitWithQuotes(str: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuote = false
    let quoteChar = ''

    for (let i = 0; i < str.length; i++) {
      const char = str[i]

      if ((char === '"' || char === "'") && (i === 0 || str[i - 1] !== '\\')) {
        if (inQuote && char === quoteChar) {
          inQuote = false
          quoteChar = ''
        } else if (!inQuote) {
          inQuote = true
          quoteChar = char
        } else {
          current += char
        }
      } else if (char === ' ' && !inQuote) {
        if (current) {
          result.push(current)
          current = ''
        }
      } else {
        current += char
      }
    }

    if (current) {
      result.push(current)
    }

    return result
  }
}

/**
 * 命令执行器
 */
export class CommandExecutor {
  private registry: CommandRegistry
  private context: CommandContext

  constructor(registry: CommandRegistry, context: CommandContext) {
    this.registry = registry
    this.context = context
  }

  /**
   * 解析并执行命令
   */
  async execute(input: string): Promise<CommandResult | null> {
    const parsed = CommandParser.parse(input)
    if (!parsed) return null

    return this.executeParsed(parsed)
  }

  /**
   * 执行已解析的命令
   */
  async executeParsed(parsed: ParsedCommand): Promise<CommandResult> {
    const command = this.registry.get(parsed.name)

    if (!command) {
      return {
        success: false,
        type: 'local',
        error: new Error(`未知命令: ${parsed.name}`)
      }
    }

    // 检查命令是否启用
    if (command.isEnabled && !command.isEnabled()) {
      return {
        success: false,
        type: command.type,
        error: new Error(`命令 ${parsed.name} 当前不可用`)
      }
    }

    try {
      console.debug(`[DEBUG] 执行命令: ${command.name}, 参数: ${parsed.args || '(无)'}`)
      
      if (command.type === 'local') {
        return await this.executeLocal(command as LocalCommand, parsed.argList)
      } else {
        return await this.executePrompt(command as PromptCommand, parsed.args)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`[ERROR] 命令执行失败: ${command.name} - ${errorMessage}`)
      
      return {
        success: false,
        type: command.type,
        error: error instanceof Error ? error : new Error(String(error))
      }
    }
  }

  /**
   * 执行本地命令
   */
  private async executeLocal(command: LocalCommand, args: string[]): Promise<CommandResult> {
    try {
      await command.handler(args, this.context)
      return {
        success: true,
        type: 'local'
      }
    } catch (error) {
      throw new Error(`本地命令 ${command.name} 执行失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 执行提示词命令
   */
  private async executePrompt(command: PromptCommand, args: string): Promise<CommandResult> {
    try {
      // 检查是否需要参数但未提供
      if (command.argumentHint && !args.trim()) {
        throw new Error(`命令 ${command.name} 需要参数: ${command.argumentHint}`)
      }

      const prompt = await command.getPrompt(args)
      
      return {
        success: true,
        type: 'prompt',
        prompt
      }
    } catch (error) {
      throw new Error(`提示词命令 ${command.name} 执行失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

/**
 * 命令帮助格式化器
 */
export class CommandHelpFormatter {
  static format(commands: Command[]): string {
    const lines: string[] = []

    lines.push(`${COLORS.bright}${COLORS.green}可用命令:${COLORS.reset}`)
    lines.push('')

    // 分组显示命令
    const localCommands = commands.filter(c => c.type === 'local' && !c.isHidden)
    const promptCommands = commands.filter(c => c.type === 'prompt' && !c.isHidden)

    if (localCommands.length > 0) {
      lines.push(`${COLORS.dim}【本地命令】${COLORS.reset}`)
      for (const cmd of localCommands) {
        lines.push(this.formatCommand(cmd))
      }
      lines.push('')
    }

    if (promptCommands.length > 0) {
      lines.push(`${COLORS.dim}【提示词命令】${COLORS.reset}`)
      for (const cmd of promptCommands) {
        lines.push(this.formatCommand(cmd))
      }
      lines.push('')
    }

    return lines.join('\n')
  }

  private static formatCommand(cmd: Command): string {
    const aliasPart = cmd.aliases && cmd.aliases.length > 0
      ? ` (${cmd.aliases.join(', ')})`
      : ''

    const argPart = cmd.argumentHint
      ? ` ${cmd.argumentHint}`
      : ''

    let line = `  ${COLORS.cyan}/${cmd.name}${argPart}${COLORS.reset}`
    line += `${aliasPart}`
    line += ` - ${cmd.description}`

    if (cmd.whenToUse) {
      line += `\n    ${COLORS.dim}使用场景: ${cmd.whenToUse}${COLORS.reset}`
    }

    return line
  }
}

// 导出便捷函数
export function createCommandRegistry(commands: Command[] = []): CommandRegistry {
  const registry = new CommandRegistry()
  registry.registerAll(commands)
  return registry
}
