/**
 * 默认命令定义
 * 使用新的命令系统架构
 */

import type { Command, CommandContext, Message } from '../types.js'
import { COLORS } from '../constants/colors.js'
import { loadSkills, listSkills } from '../skills.js'
import { CommandHelpFormatter } from '../command-system.js'

// ========== 本地命令 ==========

export const HelpCommand: Command = {
  type: 'local',
  name: 'help',
  aliases: ['?', 'h'],
  description: '显示帮助信息',
  whenToUse: '当你需要查看可用命令时使用',
  handler: (args: string[], context: CommandContext) => {
    // 获取所有注册的命令
    const { commandRegistry } = context as any
    const commands = commandRegistry ? commandRegistry.getVisible() : []

    console.log()
    console.log(CommandHelpFormatter.format(commands))
    console.log(`
${COLORS.bright}${COLORS.green}技能使用:${COLORS.reset}

  直接输入 "/技能名称 [参数]" 来执行技能，例如：
  nanoagent> /commit "提交信息"
  nanoagent> /simplify
  nanoagent> /remember

${COLORS.bright}${COLORS.green}使用示例:${COLORS.reset}

  nanoagent> 列出当前目录的文件
  nanoagent> 读取 package.json
  nanoagent> 创建一个 test.txt 文件
  nanoagent> /skills
  nanoagent> /commit "修复 bug"
`)
  }
}

export const ClearCommand: Command = {
  type: 'local',
  name: 'clear',
  aliases: ['c', 'reset'],
  description: '清空对话历史，开始新对话',
  whenToUse: '当你想要清空历史记录开始新对话时使用',
  handler: (args: string[], context: CommandContext) => {
    const { agent } = context
    if (agent && typeof agent.clearHistory === 'function') {
      agent.clearHistory()
      console.log(`${COLORS.green}✓ 对话历史已清空${COLORS.reset}\n`)
    }
  }
}

export const HistoryCommand: Command = {
  type: 'local',
  name: 'history',
  aliases: ['hist'],
  description: '显示对话历史',
  whenToUse: '当你需要查看之前的对话消息时使用',
  handler: (args: string[], context: CommandContext) => {
    const { agent } = context
    if (!agent || typeof agent.getMessages !== 'function') {
      return
    }

    const messages = agent.getMessages() as Message[]
    console.log(`
${COLORS.bright}${COLORS.yellow}对话历史 (${messages.length} 条消息):${COLORS.reset}
`)
    messages.forEach((msg, index) => {
      const roleColor =
        msg.role === 'system'
          ? COLORS.dim
          : msg.role === 'user'
            ? COLORS.green
            : msg.role === 'assistant'
              ? COLORS.blue
              : msg.role === 'tool'
                ? COLORS.yellow
                : COLORS.white

      const roleLabel = msg.role.toUpperCase().padEnd(10)
      const preview =
        msg.content.length > 100 ? msg.content.slice(0, 100) + '...' : msg.content

      console.log(`${COLORS.dim}[${index}]${COLORS.reset} ${roleColor}${roleLabel}${COLORS.reset} ${preview}`)
    })
    console.log()
  }
}

export const SkillsCommand: Command = {
  type: 'local',
  name: 'skills',
  aliases: ['list-skills', 'ls'],
  description: '列出所有可用技能',
  whenToUse: '当你需要查看有哪些技能可用时使用',
  handler: () => {
    const skills = loadSkills()
    console.log()
    console.log(listSkills(skills))
    console.log()
  }
}

export const ExitCommand: Command = {
  type: 'local',
  name: 'exit',
  aliases: ['quit', 'q'],
  description: '退出程序',
  whenToUse: '当你想要结束程序时使用',
  handler: () => {
    console.log(`${COLORS.green}再见！${COLORS.reset}`)
    process.exit(0)
  }
}

// ========== 提示词命令示例 ==========

export const SummarizeCommand: Command = {
  type: 'prompt',
  name: 'summarize',
  aliases: ['sum'],
  description: '总结当前对话',
  argumentHint: '[细节级别: 简洁|详细]',
  whenToUse: '当你需要总结当前对话内容时使用',
  getPrompt: (args: string): string => {
    const detailLevel = args.toLowerCase() === '详细' ? '详细' : '简洁'
    return `请总结我们当前的对话。

要求：
- 风格：${detailLevel}
- 包含主要话题和结论
- 突出重要的决定或行动项

请用清晰的结构来组织总结。`
  }
}

export const RefineCommand: Command = {
  type: 'prompt',
  name: 'refine',
  description: '优化改进之前的回复',
  argumentHint: '[优化方向]',
  whenToUse: '当你想要改进或优化上一次回复时使用',
  getPrompt: (args: string): string => {
    const direction = args || '使回复更清晰、更详细'
    return `请查看我们的对话历史，特别是我上一次的回复。

请根据以下方向优化改进：${direction}

请提供改进后的版本。`
  }
}

export const ExplainCommand: Command = {
  type: 'prompt',
  name: 'explain',
  description: '解释某个概念或代码',
  argumentHint: '<要解释的内容>',
  whenToUse: '当你需要详细解释某个概念时使用',
  getPrompt: (args: string): string | Message[] => {
    if (!args) {
      return '请询问用户想要解释什么内容。'
    }
    return `请详细解释以下内容："${args}"

请：
1. 用简单易懂的语言解释
2. 提供示例（如果适用）
3. 指出关键点和注意事项
4. 回答可能的相关问题`
  }
}

// ========== 命令集合 ==========

export const DEFAULT_LOCAL_COMMANDS: Command[] = [
  HelpCommand,
  ClearCommand,
  HistoryCommand,
  SkillsCommand,
  ExitCommand,
]

export const DEFAULT_PROMPT_COMMANDS: Command[] = [
  SummarizeCommand,
  RefineCommand,
  ExplainCommand,
]

export const DEFAULT_COMMANDS: Command[] = [
  ...DEFAULT_LOCAL_COMMANDS,
  ...DEFAULT_PROMPT_COMMANDS,
]

/**
 * 获取默认命令
 */
export function getDefaultCommands(): Command[] {
  return [...DEFAULT_COMMANDS]
}
