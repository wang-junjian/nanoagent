/**
 * 默认命令定义
 * 使用新的命令系统架构
 */

import type { Command, CommandContext, Message } from '../types.js'
import { COLORS } from '../constants/colors.js'
import { loadSkills, listSkills } from '../skills.js'
import { CommandHelpFormatter } from '../command-system.js'
import { Formatter, Format, InteractiveMenu, showTroubleshootingTips } from '../ui/index.js'
import { CONFIG } from '../config.js'

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

// ========== 系统信息命令 ==========

export const StatusCommand: Command = {
  type: 'local',
  name: 'status',
  aliases: ['state', 'info'],
  description: '显示系统状态和统计信息',
  whenToUse: '当你想要了解当前系统状态时使用',
  handler: (args: string[], context: CommandContext) => {
    const { agent } = context
    if (!agent) return

    const stats = agent.getContextStats()
    const messages = agent.getMessages()

    console.log()
    Formatter.heading('系统状态', 1)

    const status = {
      '模型': CONFIG.model,
      'API 地址': CONFIG.baseURL,
      '最大 Tokens': String(CONFIG.maxTokens),
      '当前消息数': String(messages.length),
      '对话消息': String(agent.getHistory().length),
      '预计 Tokens': String(stats.estimatedTokens),
      '上下文利用率': `${Math.round(stats.contextUtilization * 100)}%`
    }

    console.log()
    Formatter.keyValue(status)
    console.log()

    if (stats.contextUtilization > 0.9) {
      console.log(`${COLORS.yellow}⚠ 警告: 上下文接近满载，建议使用 /clear 清空历史${COLORS.reset}`)
      console.log()
    }
  }
}

export const ToolsCommand: Command = {
  type: 'local',
  name: 'tools',
  aliases: ['list-tools', 'toollist'],
  description: '列出所有可用工具',
  argumentHint: '[工具名称]',
  whenToUse: '当你需要查看有哪些工具可用时使用',
  handler: async (args: string[], context: CommandContext) => {
    const { toolRegistry } = context as any

    if (!toolRegistry) {
      console.log(`${COLORS.dim}工具信息不可用${COLORS.reset}`)
      return
    }

    const tools = toolRegistry.getAll ? toolRegistry.getAll() : []
    const toolName = args?.[0]

    console.log()

    if (toolName) {
      // 显示特定工具的详细信息
      const tool = tools.find((t: any) => t.name.toLowerCase() === toolName.toLowerCase())
      if (tool) {
        Formatter.heading(`工具: ${tool.name}`, 2)
        console.log(`${COLORS.dim}${tool.description}${COLORS.reset}`)
        console.log()

        if (tool.params) {
          console.log(`${COLORS.yellow}参数:${COLORS.reset}`)
          Formatter.keyValue(
            Object.entries(tool.params).reduce((acc, [key, param]: any) => {
              acc[key] = param.description || ''
              return acc
            }, {} as Record<string, string>)
          )
        }
        console.log()
      } else {
        console.log(`${COLORS.red}未找到工具: ${toolName}${COLORS.reset}`)
      }
    } else {
      // 列出所有工具
      Formatter.heading('可用工具', 2)

      const toolsList = tools.map((t: any) => [t.name, t.description || ''])
      Formatter.table(
        ['工具名称', '描述'],
        toolsList
      )
      console.log()
      console.log(`${COLORS.dim}提示: 使用 ${COLORS.cyan}/tools <工具名>${COLORS.dim} 查看详细信息${COLORS.reset}`)
      console.log()
    }
  }
}

export const ConfigCommand: Command = {
  type: 'local',
  name: 'config',
  aliases: ['configuration', 'conf'],
  description: '管理和验证配置',
  argumentHint: '[show|setup|verify]',
  whenToUse: '当你需要查看或修改配置时使用',
  handler: (args: string[], context: CommandContext) => {
    const subcommand = args?.[0] || 'show'

    console.log()

    if (subcommand === 'show') {
      Formatter.heading('当前配置', 2)
      const config = {
        'API 地址': CONFIG.baseURL,
        '模型': CONFIG.model,
        '最大 Tokens': String(CONFIG.maxTokens),
        'API Key': CONFIG.apiKey === 'NONE' ? '未设置' : '已设置'
      }
      Formatter.keyValue(config)

      console.log()
      console.log(`${COLORS.dim}配置文件位置: .env${COLORS.reset}`)
      console.log()
    } else if (subcommand === 'setup') {
      Formatter.box(
        '配置向导',
        '请按照以下步骤配置:\n\n1. 编辑 .env 文件\n2. 设置 BASE_URL（API 服务地址）\n3. 设置 MODEL（模型名称）\n4. 设置 MAX_TOKENS\n5. 运行 /config verify 验证',
        'info'
      )
      console.log()
    } else if (subcommand === 'verify') {
      const errors: string[] = []

      if (!CONFIG.baseURL || CONFIG.baseURL === 'http://localhost:11434/') {
        errors.push('✗ BASE_URL 未配置或为默认值')
      }
      if (!CONFIG.model || CONFIG.model === 'qwen3.5:9b') {
        errors.push('✗ MODEL 未配置或为默认值')
      }
      if (CONFIG.maxTokens <= 0) {
        errors.push('✗ MAX_TOKENS 配置无效')
      }

      if (errors.length === 0) {
        Formatter.box(
          '配置验证',
          '✓ 所有配置都是有效的\n✓ 可以开始使用 Nano Agent',
          'success'
        )
      } else {
        Formatter.box(
          '配置验证失败',
          errors.join('\n'),
          'error'
        )
        console.log(`\n使用 ${COLORS.cyan}/config setup${COLORS.reset} 进行配置向导\n`)
      }
    }
  }
}

export const MenuCommand: Command = {
  type: 'local',
  name: 'menu',
  aliases: ['m'],
  description: '显示命令菜单',
  whenToUse: '当你需要发现可用命令时使用',
  handler: (args: string[], context: CommandContext) => {
    console.log()

    const categories = {
      '信息和帮助': [
        { name: 'help', desc: '显示帮助信息' },
        { name: 'status', desc: '显示系统状态' },
        { name: 'config', desc: '管理配置' },
        { name: 'tools', desc: '列出工具' }
      ],
      '对话管理': [
        { name: 'clear', desc: '清空对话历史' },
        { name: 'history', desc: '查看对话历史' }
      ],
      '技能和提示': [
        { name: 'skills', desc: '列出可用技能' },
        { name: 'summarize', desc: '总结对话' },
        { name: 'refine', desc: '优化回复' },
        { name: 'explain', desc: '解释概念' }
      ],
      '控制': [
        { name: 'troubleshoot', desc: '故障排除' },
        { name: 'exit', desc: '退出程序' }
      ]
    }

    InteractiveMenu.showCommandMenu(categories)
  }
}

export const TroubleshootCommand: Command = {
  type: 'local',
  name: 'troubleshoot',
  aliases: ['help-me', 'debug'],
  description: '显示故障排除指南',
  argumentHint: '[config|api|tools]',
  whenToUse: '当遇到问题并需要解决方案时使用',
  handler: (args: string[]) => {
    const topic = args?.[0] || 'general'

    console.log()

    if (topic === 'general' || !['config', 'api', 'tools'].includes(topic)) {
      InteractiveMenu.showQuickStart()
    } else {
      showTroubleshootingTips(topic)
    }
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
  StatusCommand,
  ToolsCommand,
  ConfigCommand,
  MenuCommand,
  TroubleshootCommand,
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
