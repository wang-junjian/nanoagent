import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import type { ToolDefinition } from './types.js'
import { simpleGlob } from './utils.js'

const execAsync = promisify(exec)

// ============= 工具定义 =============
export const TOOLS: ToolDefinition[] = [
  {
    name: 'FileRead',
    description: '读取文件内容',
    params: {
      file_path: { type: 'string', description: '要读取的文件路径', required: true },
    },
    execute: async (args: Record<string, any>) => {
      const { file_path } = args
      try {
        if (!existsSync(file_path)) {
          return `错误: 文件不存在: ${file_path}`
        }
        return readFileSync(file_path, 'utf-8')
      } catch (e: any) {
        return `读取错误: ${e.message}`
      }
    },
  },
  {
    name: 'FileWrite',
    description: '创建新文件或完全覆盖现有文件',
    params: {
      file_path: { type: 'string', description: '要写入的文件路径', required: true },
      content: { type: 'string', description: '要写入的内容', required: true },
    },
    execute: async (args: Record<string, any>) => {
      const { file_path, content } = args
      try {
        writeFileSync(file_path, content, 'utf-8')
        return `成功写入文件: ${file_path}`
      } catch (e: any) {
        return `写入错误: ${e.message}`
      }
    },
  },
  {
    name: 'Glob',
    description: '搜索匹配模式的文件',
    params: {
      pattern: { type: 'string', description: 'glob 模式 (例如: *.js, **/*.ts)', required: true },
    },
    execute: async (args: Record<string, any>) => {
      const { pattern } = args
      try {
        const files = simpleGlob(pattern)
        return files.slice(0, 100).join('\n')
      } catch (e: any) {
        return `搜索错误: ${e.message}`
      }
    },
  },
  {
    name: 'Bash',
    description: '执行 shell 命令',
    params: {
      command: { type: 'string', description: '要执行的 shell 命令', required: true },
    },
    execute: async (args: Record<string, any>) => {
      const { command } = args
      try {
        const { stdout, stderr } = await execAsync(command, { timeout: 60000 })
        return (stdout || '') + (stderr || '')
      } catch (error: any) {
        return `错误: ${error.message}\n${error.stderr || ''}`
      }
    },
  },
  {
    name: 'ListDir',
    description: '列出目录内容',
    params: {
      path: { type: 'string', description: '目录路径 (默认为 .)', required: false },
    },
    execute: async (args: Record<string, any>) => {
      const { path = '.' } = args
      try {
        const entries = readdirSync(path, { withFileTypes: true })
        return entries
          .map(e => `${e.isDirectory() ? '[DIR]  ' : '[FILE] '} ${e.name}`)
          .join('\n')
      } catch (e: any) {
        return `列目录错误: ${e.message}`
      }
    },
  },
]

// ============= OpenAI 格式工具转换 =============
export function toolsToOpenAIFormat(tools: ToolDefinition[]) {
  return tools.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object' as const,
        properties: Object.fromEntries(
          Object.entries(tool.params).map(([name, param]) => [
            name,
            { type: param.type, description: param.description },
          ])
        ),
        required: Object.entries(tool.params)
          .filter(([_, param]) => param.required)
          .map(([name]) => name),
      },
    },
  }))
}
