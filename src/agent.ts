import type { Message, ToolDefinition } from './types.js'
import { TOOLS, toolsToOpenAIFormat } from './tools.js'
import { chatCompletions } from './client.js'
import { SYSTEM_PROMPT } from './config.js'

// ============= Agent 主类 =============
export class NanoAgent {
  messages: Message[] = []

  constructor() {
    this.messages.push({ role: 'system', content: SYSTEM_PROMPT })
  }

  findTool(name: string): ToolDefinition | undefined {
    return TOOLS.find(t => t.name === name)
  }

  async *run(userInput: string): AsyncGenerator<string, void, unknown> {
    this.messages.push({ role: 'user', content: userInput })

    let iteration = 0
    const maxIterations = 10

    while (iteration < maxIterations) {
      iteration++

      yield `\n[迭代 ${iteration}/${maxIterations}]\n`

      const response = await chatCompletions({
        messages: this.messages,
        tools: toolsToOpenAIFormat(TOOLS),
      })

      const choice = response.choices[0]
      const assistantMessage = choice.message

      this.messages.push({
        role: 'assistant',
        content: assistantMessage.content || '',
      })

      if (assistantMessage.content) {
        yield '\n' + assistantMessage.content + '\n'
      }

      const toolCalls = assistantMessage.tool_calls
      if (!toolCalls || toolCalls.length === 0) {
        break
      }

      for (const toolCall of toolCalls) {
        const tool = this.findTool(toolCall.function.name)
        if (!tool) {
          yield `\n[未知工具: ${toolCall.function.name}]\n`
          continue
        }

        const args = JSON.parse(toolCall.function.arguments)
        yield `\n[调用工具: ${tool.name}(${JSON.stringify(args)})]\n`

        try {
          const result = await tool.execute(args)
          yield `\n[工具结果]\n${result}\n`

          this.messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: tool.name,
            content: result,
          })
        } catch (error: any) {
          const errorMsg = `工具执行失败: ${error.message}`
          yield `\n${errorMsg}\n`
          this.messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: tool.name,
            content: errorMsg,
          })
        }
      }
    }

    if (iteration >= maxIterations) {
      yield `\n[达到最大迭代次数 ${maxIterations}，结束]\n`
    }
  }
}
