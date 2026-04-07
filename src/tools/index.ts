/**
 * 工具加载器和导出
 * 集中管理所有工具的注册和导出
 */

import { toolRegistry, registerTools } from '../tool-system.js'
import { FileReadTool, FileWriteTool, FileEditTool, ListDirTool } from './file-tools.js'
import { GlobTool, GrepTool, BashTool } from './search-tools.js'
import { AskUserQuestionTool } from './interactive-tools.js'
import { SkillTool, ListSkillsTool } from './skill-tools.js'

/**
 * 初始化所有工具
 */
export function initializeTools(): void {
  registerTools(
    new FileReadTool(),
    new FileWriteTool(),
    new FileEditTool(),
    new ListDirTool(),
    new GlobTool(),
    new GrepTool(),
    new BashTool(),
    new AskUserQuestionTool(),
    new SkillTool(),
    new ListSkillsTool(),
  )
}

/**
 * 获取所有工具定义（用于 OpenAI API）
 */
export function getAllToolsForOpenAI() {
  return toolRegistry.toOpenAIFormat()
}

/**
 * 获取所有工具定义数组（向后兼容）
 */
export function getAllToolsAsArray() {
  return toolRegistry.toToolDefinitionArray()
}

/**
 * 根据工具名称获取工具执行函数
 */
export function getTool(name: string) {
  const tool = toolRegistry.get(name)
  if (!tool) {
    return null
  }
  return (args: Record<string, any>) => tool.executeWithErrorHandling(args)
}

export { toolRegistry }
