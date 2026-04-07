import { createInterface, Interface } from 'node:readline'
import { stdin, stdout } from 'node:process'
import { NanoAgent } from './agent.js'
import { COLORS } from './constants/colors.js'
import { logger } from './logger.js'
import { loadSkills, getSkillPrompt } from './skills.js'
import {
  CommandRegistry,
  CommandExecutor,
  CommandParser,
  createCommandRegistry
} from './command-system.js'
import { getDefaultCommands } from './commands/default.js'
import { CommandSuggester, ErrorDiagnostics } from './ui/index.js'
import type { Command, Message } from './types.js'

export class REPL {
  private rl: Interface
  private agent: NanoAgent
  private commandRegistry: CommandRegistry
  private commandExecutor: CommandExecutor
  private isRunning = false

  constructor() {
    this.agent = new NanoAgent()

    // 初始化命令系统
    this.commandRegistry = createCommandRegistry(getDefaultCommands())

    // 创建命令执行上下文
    const commandContext = {
      agent: this.agent,
      cwd: process.cwd(),
      commandRegistry: this.commandRegistry
    }

    this.commandExecutor = new CommandExecutor(this.commandRegistry, commandContext as any)

    this.rl = createInterface({
      input: stdin,
      output: stdout,
      prompt: `${COLORS.cyan}nanoagent> ${COLORS.reset}`,
      terminal: true,
    })
  }

  private printBanner(): void {
    console.log(`
${COLORS.bright}${COLORS.cyan}╔═════════════════════════════════════════════╗${COLORS.reset}
${COLORS.bright}${COLORS.cyan}║        🤖 Nano Agent 交互式命令行          ║${COLORS.reset}
${COLORS.bright}${COLORS.cyan}╚═════════════════════════════════════════════╝${COLORS.reset}

${COLORS.dim}核心命令:${COLORS.reset}
  ${COLORS.cyan}/help${COLORS.reset}        - 显示帮助信息
  ${COLORS.cyan}/menu${COLORS.reset}        - 显示命令菜单
  ${COLORS.cyan}/status${COLORS.reset}      - 查看系统状态
  ${COLORS.cyan}/config${COLORS.reset}      - 配置管理

${COLORS.dim}对话管理:${COLORS.reset}
  ${COLORS.cyan}/clear${COLORS.reset}       - 清空对话历史
  ${COLORS.cyan}/history${COLORS.reset}     - 查看对话历史

${COLORS.dim}高级功能:${COLORS.reset}
  ${COLORS.cyan}/tools${COLORS.reset}       - 列出可用工具
  ${COLORS.cyan}/skills${COLORS.reset}      - 列出可用技能
  ${COLORS.cyan}/troubleshoot${COLORS.reset} - 故障排除指南

${COLORS.dim}提示词命令:${COLORS.reset}
  ${COLORS.cyan}/summarize${COLORS.reset}  - 总结对话
  ${COLORS.cyan}/refine${COLORS.reset}     - 优化回复
  ${COLORS.cyan}/explain${COLORS.reset}    - 解释概念

${COLORS.yellow}💡 提示:${COLORS.reset} 输入 ${COLORS.cyan}/menu${COLORS.reset} 查看完整命令列表
`)
  }

  private async processInput(input: string): Promise<void> {
    const trimmed = input.trim()

    // 处理斜杠命令
    if (trimmed.startsWith('/')) {
      const parts = trimmed.slice(1).split(/\s+/)
      const commandName = parts[0]
      const args = parts.slice(1)

      // 首先尝试使用新命令系统执行
      const result = await this.commandExecutor.execute(trimmed)

      if (result) {
        if (result.success) {
          if (result.type === 'prompt' && result.prompt) {
            // Prompt 命令：展开为用户输入
            console.log(`${COLORS.green}✓ 展开命令: /${commandName}${COLORS.reset}`)
            console.log()

            // 执行提示词命令
            let promptContent: string
            if (typeof result.prompt === 'string') {
              promptContent = result.prompt
            } else {
              // Message[] 格式，取最后一条消息的内容
              promptContent = result.prompt[result.prompt.length - 1].content
            }

            await this.runAgentWithInput(promptContent)
          }
          return
        } else if (result.error) {
          // 命令执行失败，检查是否是技能
          const skills = loadSkills()
          const skill = skills.get(commandName)

          if (skill && skill.userInvocable) {
            // 技能渐进式展开：直接将技能内容作为用户输入
            const skillArgs = args.join(' ')
            const skillPrompt = getSkillPrompt(skill, skillArgs)

            console.log(`${COLORS.green}✓ 展开技能: ${skill.name}${COLORS.reset}`)
            if (skill.description) {
              console.log(`${COLORS.dim}  ${skill.description}${COLORS.reset}`)
            }
            console.log()

            // 直接用展开后的技能内容运行 agent
            await this.runAgentWithInput(skillPrompt)
            return
          }

          // 既不是命令也不是技能
          console.log(`${COLORS.red}✗ 未知命令或技能: /${commandName}${COLORS.reset}`)

          // 使用命令建议系统
          const allCommands = this.commandRegistry.getVisible().map(cmd => ({
            name: cmd.name,
            description: cmd.description
          }))

          const suggestions = CommandSuggester.suggestCommands(commandName, allCommands)
          CommandSuggester.displaySuggestions(suggestions)

          console.log(`  使用 ${COLORS.cyan}/help${COLORS.reset} 查看所有可用命令`)
          console.log(`  使用 ${COLORS.cyan}/skills${COLORS.reset} 查看可用技能\n`)
          return
        }
        return
      }
    }

    // 处理普通用户输入
    if (!trimmed) {
      return
    }

    await this.runAgentWithInput(trimmed)
  }

  private async runAgentWithInput(input: string): Promise<void> {
    if (this.isRunning) {
      console.log(`${COLORS.yellow}⏳ Agent 正在处理中，请稍候...${COLORS.reset}`)
      return
    }

    this.isRunning = true
    try {
      logger.info('Processing user input', { inputLength: input.length })

      for await (const chunk of this.agent.run(input)) {
        process.stdout.write(chunk)
      }
    } catch (error: any) {
      console.error()
      // 使用改进的诊断系统
      const diagnostic = ErrorDiagnostics.diagnose(error, 'Agent 执行')
      ErrorDiagnostics.display(diagnostic)
      logger.error('REPL execution error', { error: error.message })
    } finally {
      this.isRunning = false
      console.log() // 添加空行
    }
  }

  async start(): Promise<void> {
    this.printBanner()

    // 处理 SIGINT (Ctrl+C)
    process.on('SIGINT', () => {
      console.log(`\n\n${COLORS.yellow}再见！${COLORS.reset}`)
      process.exit(0)
    })

    this.rl.prompt()

    for await (const line of this.rl) {
      await this.processInput(line)
      this.rl.prompt()
    }
  }
}
