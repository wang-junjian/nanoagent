#!/usr/bin/env tsx
/**
 * Nano Agent - 基于 Claude Code 核心原理的最简智能体
 *
 * 核心特性：
 * 1. Agent 循环：用户输入 → LLM → 工具执行 → 回到 LLM
 * 2. 工具系统：可扩展的工具定义
 * 3. 消息历史管理
 *
 * 用法:
 *   pnpm dev "你的问题"
 *   或
 *   pnpm build && pnpm start "你的问题"
 */

import { NanoAgent } from './agent.js'

// ============= 主程序 =============
async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.log('╔═══════════════════════════════════════════════════════════╗')
    console.log('║           Nano Agent - 最简智能体 (TypeScript)             ║')
    console.log('║  基于 Claude Code 核心原理                                  ║')
    console.log('╚═══════════════════════════════════════════════════════════╝')
    console.log('\n用法:')
    console.log('  pnpm dev "你的问题"')
    console.log('\n或:')
    console.log('  pnpm build && pnpm start "你的问题"')
    console.log('\n示例:')
    console.log('  pnpm dev "列出当前目录的文件"')
    console.log('  pnpm dev "读取 package.json 并告诉我这个项目是做什么的"')
    process.exit(0)
  }

  const userInput = args.join(' ')
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

main().catch(console.error)
