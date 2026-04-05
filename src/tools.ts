import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { createInterface } from 'node:readline'
import { stdin, stdout } from 'node:process'
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
    name: 'FileEdit',
    description: '编辑文件内容，通过替换旧字符串为新字符串',
    params: {
      file_path: { type: 'string', description: '要编辑的文件路径', required: true },
      old_string: { type: 'string', description: '要替换的旧字符串', required: true },
      new_string: { type: 'string', description: '替换后的新字符串', required: true },
      replace_all: { type: 'boolean', description: '是否替换所有匹配项（默认只替换第一个）', required: false },
    },
    execute: async (args: Record<string, any>) => {
      const { file_path, old_string, new_string, replace_all = false } = args
      try {
        if (!existsSync(file_path)) {
          return `错误: 文件不存在: ${file_path}`
        }
        let content = readFileSync(file_path, 'utf-8')
        if (!content.includes(old_string)) {
          return `错误: 未找到要替换的字符串: "${old_string.substring(0, 100)}..."`
        }
        if (replace_all) {
          content = content.split(old_string).join(new_string)
        } else {
          content = content.replace(old_string, new_string)
        }
        writeFileSync(file_path, content, 'utf-8')
        return `成功编辑文件: ${file_path}`
      } catch (e: any) {
        return `编辑错误: ${e.message}`
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
    name: 'Grep',
    description: '在文件内容中搜索正则表达式匹配',
    params: {
      pattern: { type: 'string', description: '要搜索的正则表达式模式', required: true },
      path: { type: 'string', description: '要搜索的文件或目录路径（默认为当前目录）', required: false },
      output_mode: { type: 'string', description: '输出模式: content（显示匹配行）或 files_with_matches（只显示文件名）', required: false },
    },
    execute: async (args: Record<string, any>) => {
      const { pattern, path = '.', output_mode = 'content' } = args
      try {
        const regex = new RegExp(pattern)
        const results: string[] = []
        const matchedFiles = new Set<string>()

        function scan(dir: string) {
          try {
            const entries = readdirSync(dir, { withFileTypes: true })
            for (const entry of entries) {
              const fullPath = `${dir}/${entry.name}`
              if (entry.isDirectory()) {
                if (!entry.name.startsWith('.')) {
                  scan(fullPath)
                }
              } else if (entry.isFile()) {
                try {
                  const content = readFileSync(fullPath, 'utf-8')
                  const lines = content.split('\n')
                  let fileMatched = false
                  for (let i = 0; i < lines.length; i++) {
                    if (regex.test(lines[i])) {
                      fileMatched = true
                      if (output_mode === 'content') {
                        results.push(`${fullPath}:${i + 1}: ${lines[i]}`)
                      }
                    }
                  }
                  if (fileMatched) {
                    matchedFiles.add(fullPath)
                  }
                } catch {
                  // 忽略无法读取的文件
                }
              }
            }
          } catch {
            // 忽略无法访问的目录
          }
        }

        if (existsSync(path)) {
          // 检查是否是目录
          try {
            readdirSync(path, { withFileTypes: true })
            scan(path)
          } catch {
            // 如果不是目录，只读取单个文件
            try {
              const content = readFileSync(path, 'utf-8')
              const lines = content.split('\n')
              const regex = new RegExp(pattern)
              for (let i = 0; i < lines.length; i++) {
                if (regex.test(lines[i])) {
                  matchedFiles.add(path)
                  if (output_mode === 'content') {
                    results.push(`${path}:${i + 1}: ${lines[i]}`)
                  }
                }
              }
            } catch {
              // 忽略无法读取的文件
            }
          }
        }

        if (output_mode === 'files_with_matches') {
          return Array.from(matchedFiles).join('\n')
        }
        return results.slice(0, 100).join('\n')
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
  {
    name: 'AskUserQuestion',
    description: '向用户询问问题并获取回答',
    params: {
      question: { type: 'string', description: '要问用户的问题', required: true },
    },
    execute: async (args: Record<string, any>) => {
      const { question } = args
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
