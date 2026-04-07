/**
 * 用户交互工具
 */

import { createInterface } from 'node:readline'
import { stdin, stdout } from 'node:process'
import { Tool } from '../tool-system.js'
import { ToolExecutionError } from '../errors.js'

export class AskUserQuestionTool extends Tool {
  name = 'AskUserQuestion'
  description = '向用户询问问题并获取回答'

  params = {
    question: { type: 'string' as const, description: '要问用户的问题', required: true },
  }

  async execute(args: Record<string, any>): Promise<string> {
    const { question } = args

    try {
      return await this.askQuestion(question)
    } catch (error) {
      throw new ToolExecutionError(
        `获取用户输入失败: ${error instanceof Error ? error.message : String(error)}`,
        this.name,
      )
    }
  }

  private askQuestion(question: string): Promise<string> {
    return new Promise((resolve) => {
      const rl = createInterface({
        input: stdin,
        output: stdout,
      })

      console.log(`\n[问题] ${question}`)
      rl.question('[回答] ', (answer) => {
        rl.close()
        resolve(answer || '(用户没有提供回答)')
      })
    })
  }
}
