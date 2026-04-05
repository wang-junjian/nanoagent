#!/usr/bin/env tsx
/**
 * Nano Agent - 基于 Claude Code 核心原理的最简智能体
 *
 * 核心特性：
 * 1. Agent 循环：用户输入 → LLM → 工具执行 → 回到 LLM
 * 2. 工具系统：可扩展的工具定义
 * 3. 消息历史管理
 * 4. 交互式 REPL 模式
 *
 * 用法:
 *   pnpm dev              # 进入交互式 REPL
 *   pnpm dev "你的问题"    # 单次执行模式
 */

// 加载 .env 文件（零依赖实现）- 必须在任何 import 之前执行
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env')
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIndex = trimmed.indexOf('=')
        if (eqIndex > 0) {
          const key = trimmed.slice(0, eqIndex).trim()
          let value = trimmed.slice(eqIndex + 1).trim()
          // 移除引号（支持单引号和双引号）
          if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1)
          }
          process.env[key] = value
        }
      }
    }
  }
}

loadEnv()

// 现在才导入其他模块（使用动态 import 确保 .env 已加载）
// 重要: 静态 import 会被提升到代码顶部执行，导致 process.env 在 loadEnv() 之前被读取
// 使用 await import() 确保 .env 文件在 config.ts 读取 process.env 之前已经加载完毕
async function bootstrap() {
  const { NanoAgent } = await import('./agent.js')
  const { REPL } = await import('./repl.js')

  // ============= 主程序 =============
  async function main() {
    const args = process.argv.slice(2)

    // 如果有参数，使用单次执行模式
    if (args.length > 0) {
      await runSingleMode(args.join(' '))
      return
    }

    // 否则进入交互式 REPL 模式
    const repl = new REPL()
    await repl.start()
  }

  async function runSingleMode(userInput: string) {
    const agent = new NanoAgent()

    console.log('🤖 Nano Agent 正在处理...')
    console.log('═'.repeat(60))

    try {
      for await (const chunk of agent.run(userInput)) {
        process.stdout.write(chunk)
      }
    } catch (error: any) {
      console.error(`\n❌ 错误: ${error.message}`)
      console.error(error.stack)
    }

    console.log('\n' + '═'.repeat(60))
    console.log('✅ 完成')
  }

  // 显示帮助信息
  function showHelp() {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║           Nano Agent - 最简智能体 (TypeScript)             ║
║  基于 Claude Code 核心原理                                  ║
╚═══════════════════════════════════════════════════════════╝

用法:
  pnpm dev                    # 进入交互式 REPL 模式
  pnpm dev "你的问题"          # 单次执行模式

示例:
  pnpm dev
  pnpm dev "列出当前目录的文件"
  pnpm dev "读取 package.json 并告诉我这个项目是做什么的"

交互式 REPL 命令:
  /help     - 显示帮助
  /clear    - 清空对话历史
  /history  - 查看对话历史
  /exit     - 退出程序
`)
  }

  // 检查是否是 --help 或 -h
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showHelp()
    process.exit(0)
  }

  await main()
}

bootstrap().catch(console.error)
