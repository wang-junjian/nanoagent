#!/usr/bin/env node

/**
 * Nano Agent 集成测试脚本
 * 
 * 测试内容:
 * 1. 命令系统是否正常工作
 * 2. Skill 系统是否正常工作
 * 3. Agent 循环是否正常工作
 */

import { createCommandRegistry, CommandParser, CommandExecutor } from './src/command-system.js'
import { getDefaultCommands } from './src/commands/default.js'
import { loadSkills } from './src/skills.js'
import { initBundledSkills } from './src/skills/bundled/index.js'
import { NanoAgent } from './src/agent.js'

// 初始化内置技能（测试前必须调用）
initBundledSkills()

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
}

let passedTests = 0
let failedTests = 0

function test(name: string, fn: () => boolean | Promise<boolean>): void {
  console.log(`\n${colors.blue}► 测试: ${name}${colors.reset}`)
  try {
    const result = fn()
    if (result instanceof Promise) {
      result
        .then((passed) => {
          if (passed) {
            console.log(`${colors.green}  ✓ 通过${colors.reset}`)
            passedTests++
          } else {
            console.log(`${colors.red}  ✗ 失败${colors.reset}`)
            failedTests++
          }
        })
        .catch((error) => {
          console.log(`${colors.red}  ✗ 异常: ${error.message}${colors.reset}`)
          failedTests++
        })
    } else {
      if (result) {
        console.log(`${colors.green}  ✓ 通过${colors.reset}`)
        passedTests++
      } else {
        console.log(`${colors.red}  ✗ 失败${colors.reset}`)
        failedTests++
      }
    }
  } catch (error: any) {
    console.log(`${colors.red}  ✗ 异常: ${error.message}${colors.reset}`)
    failedTests++
  }
}

function assert(condition: boolean, message: string): boolean {
  if (!condition) {
    console.log(`${colors.red}    断言失败: ${message}${colors.reset}`)
    return false
  }
  return true
}

console.log(`
${colors.bold}${colors.blue}╔════════════════════════════════════════════════╗${colors.reset}
${colors.bold}${colors.blue}║     Nano Agent 集成测试套件                    ║${colors.reset}
${colors.bold}${colors.blue}╚════════════════════════════════════════════════╝${colors.reset}
`)

// ============= 命令系统测试 =============
console.log(`\n${colors.bold}${colors.yellow}命令系统测试${colors.reset}`)

test('CommandParser - 解析简单命令', () => {
  const result = CommandParser.parse('/help')
  return assert(result?.name === 'help', '命令名应为 help')
})

test('CommandParser - 解析带参数的命令', () => {
  const result = CommandParser.parse('/commit "修复 bug"')
  // splitWithQuotes 会去掉引号，这是预期行为
  return (
    assert(result?.name === 'commit', '命令名应为 commit') &&
    assert(result?.args === '修复 bug', '参数应去掉引号')
  )
})

test('CommandParser - 处理空命令', () => {
  const result = CommandParser.parse('')
  return assert(result === null, '空字符串应返回 null')
})

test('CommandRegistry - 注册和获取命令', () => {
  const registry = createCommandRegistry()
  const commands = getDefaultCommands()
  registry.registerAll(commands)

  const helpCmd = registry.get('help')
  return (
    assert(helpCmd !== undefined, 'help 命令应存在') &&
    assert(helpCmd?.name === 'help', 'help 命令名应正确') &&
    assert(helpCmd?.type === 'local', 'help 应为本地命令')
  )
})

test('CommandRegistry - 别名解析', () => {
  const registry = createCommandRegistry()
  const commands = getDefaultCommands()
  registry.registerAll(commands)

  const helpCmd1 = registry.get('help')
  const helpCmd2 = registry.get('?')
  const helpCmd3 = registry.get('h')

  return (
    assert(helpCmd1?.name === 'help', 'help 命令应存在') &&
    assert(helpCmd2?.name === 'help', '别名 ? 应指向 help') &&
    assert(helpCmd3?.name === 'help', '别名 h 应指向 help')
  )
})

test('CommandExecutor - 执行本地命令', async () => {
  const registry = createCommandRegistry()
  const commands = getDefaultCommands()
  registry.registerAll(commands)

  const context = {
    agent: null,
    cwd: process.cwd(),
  }

  const executor = new CommandExecutor(registry, context)
  const result = await executor.execute('/clear')

  return assert(result?.success === true, '命令应成功执行')
})

test('CommandExecutor - 处理未知命令', async () => {
  const registry = createCommandRegistry()
  const context = { agent: null, cwd: process.cwd() }
  const executor = new CommandExecutor(registry, context)

  const result = await executor.execute('/unknown')
  return assert(result?.success === false, '未知命令应返回失败')
})

// ============= Skill 系统测试 =============
console.log(`\n${colors.bold}${colors.yellow}Skill 系统测试${colors.reset}`)

test('loadSkills - 加载技能', () => {
  const skills = loadSkills()
  return assert(skills.size > 0, '应该至少加载一些技能')
})

test('loadSkills - 内置技能', () => {
  const skills = loadSkills()
  const hasBuiltIn = Array.from(skills.values()).some((s) => s.source === 'bundled')
  return assert(hasBuiltIn, '应该存在内置技能')
})

// ============= Agent 系统测试 =============
console.log(`\n${colors.bold}${colors.yellow}Agent 系统测试${colors.reset}`)

test('NanoAgent - 创建实例', () => {
  const agent = new NanoAgent()
  return assert(agent !== null, 'Agent 应能创建实例')
})

test('NanoAgent - 获取消息历史', () => {
  const agent = new NanoAgent()
  const messages = agent.getMessages()
  return assert(Array.isArray(messages), '消息应为数组')
})

test('NanoAgent - 清空历史', () => {
  const agent = new NanoAgent()
  // 获取初始历史（不包括系统消息）
  const initialHistory = agent.getHistory()
  const initialCount = initialHistory.length
  
  agent.clearHistory()
  
  // 清空后，历史应该是空的（系统消息不计入 getHistory）
  const afterHistory = agent.getHistory()
  const afterCount = afterHistory.length
  
  return assert(afterCount === 0, `历史应被清空，但仍有 ${afterCount} 条消息`)
})

// ============= 输出总结 =============
console.log(`

${colors.bold}${colors.yellow}测试总结${colors.reset}
${colors.green}✓ 通过: ${passedTests}${colors.reset}
${colors.red}✗ 失败: ${failedTests}${colors.reset}
`)

if (failedTests === 0) {
  console.log(`${colors.bold}${colors.green}🎉 所有测试通过！${colors.reset}\n`)
  process.exit(0)
} else {
  console.log(`${colors.bold}${colors.red}⚠️  有 ${failedTests} 个测试失败${colors.reset}\n`)
  process.exit(1)
}
