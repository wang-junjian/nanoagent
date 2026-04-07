/**
 * 文件操作工具
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { Tool } from '../tool-system.js'
import { ToolExecutionError } from '../errors.js'

export class FileReadTool extends Tool {
  name = 'FileRead'
  description = '读取文件内容'

  params = {
    file_path: { type: 'string' as const, description: '要读取的文件路径', required: true },
  }

  async execute(args: Record<string, any>): Promise<string> {
    const { file_path } = args

    if (!existsSync(file_path)) {
      throw new ToolExecutionError(
        `文件不存在: ${file_path}`,
        this.name,
        { file_path },
      )
    }

    try {
      return readFileSync(file_path, 'utf-8')
    } catch (error) {
      throw new ToolExecutionError(
        `读取文件失败: ${error instanceof Error ? error.message : String(error)}`,
        this.name,
        { file_path },
      )
    }
  }
}

export class FileWriteTool extends Tool {
  name = 'FileWrite'
  description = '创建新文件或完全覆盖现有文件'

  params = {
    file_path: { type: 'string' as const, description: '要写入的文件路径', required: true },
    content: { type: 'string' as const, description: '要写入的内容', required: true },
  }

  async execute(args: Record<string, any>): Promise<string> {
    const { file_path, content } = args

    try {
      writeFileSync(file_path, content, 'utf-8')
      return `成功写入文件: ${file_path}`
    } catch (error) {
      throw new ToolExecutionError(
        `写入文件失败: ${error instanceof Error ? error.message : String(error)}`,
        this.name,
        { file_path },
      )
    }
  }
}

export class FileEditTool extends Tool {
  name = 'FileEdit'
  description = '编辑文件内容，通过替换旧字符串为新字符串'

  params = {
    file_path: { type: 'string' as const, description: '要编辑的文件路径', required: true },
    old_string: { type: 'string' as const, description: '要替换的旧字符串', required: true },
    new_string: { type: 'string' as const, description: '替换后的新字符串', required: true },
    replace_all: {
      type: 'boolean' as const,
      description: '是否替换所有匹配项（默认只替换第一个）',
      required: false,
    },
  }

  async execute(args: Record<string, any>): Promise<string> {
    const { file_path, old_string, new_string, replace_all = false } = args

    if (!existsSync(file_path)) {
      throw new ToolExecutionError(
        `文件不存在: ${file_path}`,
        this.name,
        { file_path },
      )
    }

    try {
      let content = readFileSync(file_path, 'utf-8')

      if (!content.includes(old_string)) {
        throw new ToolExecutionError(
          `未找到要替换的字符串: "${old_string.substring(0, 100)}..."`,
          this.name,
          { file_path },
        )
      }

      if (replace_all) {
        content = content.split(old_string).join(new_string)
      } else {
        content = content.replace(old_string, new_string)
      }

      writeFileSync(file_path, content, 'utf-8')
      return `成功编辑文件: ${file_path}`
    } catch (error) {
      if (error instanceof ToolExecutionError) {
        throw error
      }
      throw new ToolExecutionError(
        `编辑文件失败: ${error instanceof Error ? error.message : String(error)}`,
        this.name,
        { file_path },
      )
    }
  }
}

export class ListDirTool extends Tool {
  name = 'ListDir'
  description = '列出目录内容'

  params = {
    path: { type: 'string' as const, description: '目录路径 (默认为 .)', required: false },
  }

  async execute(args: Record<string, any>): Promise<string> {
    const { path = '.' } = args

    try {
      const entries = readdirSync(path, { withFileTypes: true })
      return entries
        .map(e => `${e.isDirectory() ? '[DIR]  ' : '[FILE] '} ${e.name}`)
        .join('\n')
    } catch (error) {
      throw new ToolExecutionError(
        `列目录失败: ${error instanceof Error ? error.message : String(error)}`,
        this.name,
        { path },
      )
    }
  }
}
