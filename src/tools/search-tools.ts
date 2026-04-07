/**
 * 搜索和系统工具
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { Tool } from '../tool-system.js'
import { ToolExecutionError } from '../errors.js'
import { simpleGlob } from '../utils.js'

const execAsync = promisify(exec)

export class GlobTool extends Tool {
  name = 'Glob'
  description = '搜索匹配模式的文件'

  params = {
    pattern: {
      type: 'string' as const,
      description: 'glob 模式 (例如: *.js, **/*.ts)',
      required: true,
    },
  }

  async execute(args: Record<string, any>): Promise<string> {
    const { pattern } = args

    try {
      const files = simpleGlob(pattern)
      return files.slice(0, 100).join('\n')
    } catch (error) {
      throw new ToolExecutionError(
        `搜索文件失败: ${error instanceof Error ? error.message : String(error)}`,
        this.name,
        { pattern },
      )
    }
  }
}

export class GrepTool extends Tool {
  name = 'Grep'
  description = '在文件内容中搜索正则表达式匹配'

  params = {
    pattern: { type: 'string' as const, description: '要搜索的正则表达式模式', required: true },
    path: {
      type: 'string' as const,
      description: '要搜索的文件或目录路径（默认为当前目录）',
      required: false,
    },
    output_mode: {
      type: 'string' as const,
      description: '输出模式: content（显示匹配行）或 files_with_matches（只显示文件名）',
      required: false,
    },
  }

  async execute(args: Record<string, any>): Promise<string> {
    const { pattern, path = '.', output_mode = 'content' } = args

    try {
      const regex = new RegExp(pattern)
      const results: string[] = []
      const matchedFiles = new Set<string>()

      this.scan(path, regex, results, matchedFiles)

      if (output_mode === 'files_with_matches') {
        return Array.from(matchedFiles).join('\n')
      }

      return results.slice(0, 100).join('\n')
    } catch (error) {
      throw new ToolExecutionError(
        `搜索失败: ${error instanceof Error ? error.message : String(error)}`,
        this.name,
        { pattern, path },
      )
    }
  }

  private scan(
    dir: string,
    regex: RegExp,
    results: string[],
    matchedFiles: Set<string>,
  ): void {
    try {
      const entries = readdirSync(dir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = `${dir}/${entry.name}`

        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.')) {
            this.scan(fullPath, regex, results, matchedFiles)
          }
        } else if (entry.isFile()) {
          try {
            const content = readFileSync(fullPath, 'utf-8')
            const lines = content.split('\n')

            for (let i = 0; i < lines.length; i++) {
              if (regex.test(lines[i])) {
                matchedFiles.add(fullPath)
                results.push(`${fullPath}:${i + 1}: ${lines[i]}`)
              }
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
}

export class BashTool extends Tool {
  name = 'Bash'
  description = '执行 shell 命令'

  params = {
    command: { type: 'string' as const, description: '要执行的 shell 命令', required: true },
  }

  async execute(args: Record<string, any>): Promise<string> {
    const { command } = args

    try {
      const { stdout, stderr } = await execAsync(command, { timeout: 60000 })
      return (stdout || '') + (stderr || '')
    } catch (error: any) {
      throw new ToolExecutionError(
        `命令执行失败: ${error.message}`,
        this.name,
        { command, stderr: error.stderr },
      )
    }
  }
}
