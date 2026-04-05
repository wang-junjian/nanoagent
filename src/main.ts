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

import { NanoAgent } from './agent.js'
import { REPL } from './repl.js'

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

main().catch(console.error)
