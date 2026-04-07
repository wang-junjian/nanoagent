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
 *   npm run dev              # 进入交互式 REPL
 *   npm run dev "你的问题"    # 单次执行模式
 */

// 第一步：加载环境变量（必须在导入其他模块之前）
import { loadEnv } from './env.js'
loadEnv()

// 现在可以安全地导入其他模块（使用动态 import 确保 .env 已加载）
async function bootstrap() {
  const { NanoAgent } = await import('./agent.js')
  const { REPL } = await import('./repl.js')
  const { initializeTools } = await import('./tools/index.js')
  const { initBundledSkills } = await import('./skills/bundled/index.js')
  const { logger } = await import('./logger.js')

  // 初始化工具系统和技能系统
  initializeTools()
  initBundledSkills()
  logger.info('Tools and skills initialized successfully')

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
      logger.error('Single mode execution failed', { error: error.message })
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
  npm run dev                    # 进入交互式 REPL 模式
  npm run dev "你的问题"          # 单次执行模式

示例:
  npm run dev
  npm run dev "列出当前目录的文件"
  npm run dev "读取 package.json 并告诉我这个项目是做什么的"

交互式 REPL 命令:
  /help     - 显示帮助
  /clear    - 清空对话历史
  /history  - 查看对话历史
  /skills   - 列出可用技能
  /exit     - 退出程序

提示词命令:
  /summarize - 总结当前对话
  /refine    - 优化改进回复
  /explain   - 解释概念或代码
`)
  }

  // 检查是否是 --help 或 -h
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showHelp()
    process.exit(0)
  }

  await main()
}

bootstrap().catch(error => {
  console.error('❌ Bootstrap failed:', error)
  process.exit(1)
})
