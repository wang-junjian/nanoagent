import { createInterface, Interface } from 'node:readline'
import { stdin, stdout } from 'node:process'
import { NanoAgent } from './agent.js'

// ANSI 颜色代码
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
}

export class REPL {
  private rl: Interface
  private agent: NanoAgent
  private isRunning = false

  constructor() {
    this.agent = new NanoAgent()
    this.rl = createInterface({
      input: stdin,
      output: stdout,
      prompt: `${COLORS.cyan}nanoagent> ${COLORS.reset}`,
      terminal: true,
    })
  }

  private printBanner(): void {
    console.log(`
${COLORS.bright}${COLORS.cyan}╔═══════════════════════════════════════════╗${COLORS.reset}
${COLORS.bright}${COLORS.cyan}║     Nano Agent - 交互式命令行             ║${COLORS.reset}
${COLORS.bright}${COLORS.cyan}╚═══════════════════════════════════════════╝${COLORS.reset}

${COLORS.dim}输入你的问题，或使用以下命令:${COLORS.reset}
  ${COLORS.yellow}/help${COLORS.reset}    - 显示帮助信息
  ${COLORS.yellow}/clear${COLORS.reset}   - 清空对话历史
  ${COLORS.yellow}/exit${COLORS.reset}    - 退出程序
  ${COLORS.yellow}/history${COLORS.reset} - 查看对话历史
`)
  }

  private printHelp(): void {
    console.log(`
${COLORS.bright}${COLORS.green}可用命令:${COLORS.reset}

  ${COLORS.cyan}/help${COLORS.reset}     - 显示此帮助信息
  ${COLORS.cyan}/clear${COLORS.reset}    - 清空当前对话历史，开始新对话
  ${COLORS.cyan}/exit${COLORS.reset}     - 退出程序 (也可用 Ctrl+C 或 Ctrl+D)
  ${COLORS.cyan}/history${COLORS.reset}  - 显示当前对话的消息历史

${COLORS.bright}${COLORS.green}使用示例:${COLORS.reset}

  nanoagent> 列出当前目录的文件
  nanoagent> 读取 package.json
  nanoagent> 创建一个 test.txt 文件
`)
  }

  private printHistory(): void {
    console.log(`
${COLORS.bright}${COLORS.yellow}对话历史 (${this.agent.messages.length} 条消息):${COLORS.reset}
`)
    this.agent.messages.forEach((msg, index) => {
      const roleColor =
        msg.role === 'system' ? COLORS.dim
        : msg.role === 'user' ? COLORS.green
        : msg.role === 'assistant' ? COLORS.blue
        : msg.role === 'tool' ? COLORS.yellow
        : COLORS.white

      const roleLabel = msg.role.toUpperCase().padEnd(10)
      const preview = msg.content.length > 100
        ? msg.content.slice(0, 100) + '...'
        : msg.content

      console.log(`${COLORS.dim}[${index}]${COLORS.reset} ${roleColor}${roleLabel}${COLORS.reset} ${preview}`)
    })
    console.log()
  }

  private clearHistory(): void {
    this.agent = new NanoAgent()
    console.log(`${COLORS.green}✓ 对话历史已清空${COLORS.reset}\n`)
  }

  private async processInput(input: string): Promise<void> {
    const trimmed = input.trim()

    // 处理斜杠命令
    if (trimmed.startsWith('/')) {
      const [command, ...args] = trimmed.slice(1).split(' ')
      switch (command.toLowerCase()) {
        case 'help':
        case '?':
          this.printHelp()
          break
        case 'clear':
          this.clearHistory()
          break
        case 'exit':
        case 'quit':
        case 'q':
          this.isRunning = false
          this.rl.close()
          return
        case 'history':
          this.printHistory()
          break
        default:
          console.log(`${COLORS.red}未知命令: /${command}${COLORS.reset}`)
          console.log(`${COLORS.dim}输入 /help 查看可用命令${COLORS.reset}\n`)
      }
      return
    }

    // 空输入，忽略
    if (!trimmed) {
      return
    }

    // 正常对话
    console.log()
    try {
      for await (const chunk of this.agent.run(trimmed)) {
        process.stdout.write(chunk)
      }
    } catch (error: any) {
      console.error(`\n${COLORS.red}✗ 错误: ${error.message}${COLORS.reset}`)
    }
    console.log()
  }

  async start(): Promise<void> {
    this.isRunning = true
    this.printBanner()

    // 处理 SIGINT (Ctrl+C)
    process.on('SIGINT', () => {
      console.log(`\n\n${COLORS.yellow}再见！${COLORS.reset}`)
      this.isRunning = false
      this.rl.close()
      process.exit(0)
    })

    // 设置 readline 事件
    this.rl.on('line', async (input) => {
      this.rl.pause()
      await this.processInput(input)
      if (this.isRunning) {
        this.rl.prompt()
        this.rl.resume()
      }
    })

    this.rl.on('close', () => {
      if (this.isRunning) {
        console.log(`\n${COLORS.yellow}再见！${COLORS.reset}`)
        process.exit(0)
      }
    })

    this.rl.prompt()
  }
}
