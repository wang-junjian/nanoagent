/**
 * 工具系统 - 面向对象的工具定义和工厂模式
 * 改进了原有的工具定义方式，提供更好的可扩展性和可维护性
 */

import type { ToolDefinition, ToolParam, ToolResult, Message } from './types.js'
import { ToolExecutionError } from './errors.js'

/**
 * 抽象工具基类
 * 所有具体工具都应该继承此类
 */
export abstract class Tool {
  abstract name: string
  abstract description: string
  abstract params: Record<string, ToolParam>

  /**
   * 执行工具
   */
  abstract execute(args: Record<string, any>): Promise<string | ToolResult>

  /**
   * 验证输入参数
   */
  protected validateParams(args: Record<string, any>): void {
    for (const [key, param] of Object.entries(this.params)) {
      if (param.required && !(key in args)) {
        throw new ToolExecutionError(
          `Missing required parameter: ${key}`,
          this.name,
          { param: key },
        )
      }

      if (key in args && param.type && typeof args[key] !== param.type) {
        throw new ToolExecutionError(
          `Parameter ${key} has invalid type. Expected ${param.type}, got ${typeof args[key]}`,
          this.name,
          { param: key, expected: param.type, actual: typeof args[key] },
        )
      }
    }
  }

  /**
   * 转换为 OpenAI 工具格式
   */
  toOpenAIFormat(): Record<string, any> {
    return {
      type: 'function',
      function: {
        name: this.name,
        description: this.description,
        parameters: {
          type: 'object',
          properties: Object.fromEntries(
            Object.entries(this.params).map(([key, param]) => [
              key,
              {
                type: param.type,
                description: param.description,
              },
            ]),
          ),
          required: Object.entries(this.params)
            .filter(([, param]) => param.required)
            .map(([key]) => key),
        },
      },
    }
  }

  /**
   * 安全执行工具，带错误处理
   */
  async executeWithErrorHandling(args: Record<string, any>): Promise<string | ToolResult> {
    try {
      this.validateParams(args)
      return await this.execute(args)
    } catch (error) {
      if (error instanceof ToolExecutionError) {
        throw error
      }
      throw new ToolExecutionError(
        error instanceof Error ? error.message : String(error),
        this.name,
        { originalError: error },
      )
    }
  }
}

/**
 * 工具注册表和工厂
 */
export class ToolRegistry {
  private tools: Map<string, Tool> = new Map()

  /**
   * 注册工具
   */
  register(tool: Tool): void {
    this.tools.set(tool.name, tool)
  }

  /**
   * 取消注册工具
   */
  unregister(name: string): boolean {
    return this.tools.delete(name)
  }

  /**
   * 获取工具
   */
  get(name: string): Tool | undefined {
    return this.tools.get(name)
  }

  /**
   * 获取所有工具
   */
  getAll(): Tool[] {
    return Array.from(this.tools.values())
  }

  /**
   * 检查工具是否存在
   */
  has(name: string): boolean {
    return this.tools.has(name)
  }

  /**
   * 获取所有工具的 OpenAI 格式定义
   */
  toOpenAIFormat(): Record<string, any>[] {
    return this.getAll().map(tool => tool.toOpenAIFormat())
  }

  /**
   * 转换为原始工具定义列表（用于兼容性）
   */
  toToolDefinitionArray(): ToolDefinition[] {
    return this.getAll().map(tool => ({
      name: tool.name,
      description: tool.description,
      params: tool.params,
      execute: (args: Record<string, any>) => tool.executeWithErrorHandling(args),
    }))
  }
}

/**
 * 全局工具注册表实例
 */
export const toolRegistry = new ToolRegistry()

/**
 * 批量注册工具的辅助函数
 */
export function registerTools(...tools: Tool[]): void {
  for (const tool of tools) {
    toolRegistry.register(tool)
  }
}
