import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * 环境变量加载器
 * 从 .env 文件中读取并加载环境变量到 process.env
 *
 * 特点：
 * - 同步解析，保证在任何导入前加载完成
 * - 支持注释行和空行
 * - 支持带引号的值
 * - 保持原有行为兼容性
 */
export class EnvLoader {
  /**
   * 解析并加载 .env 文件
   * 必须在导入其他模块前调用
   */
  static load(envPath: string = '.env'): void {
    const fullPath = resolve(process.cwd(), envPath)

    if (!existsSync(fullPath)) {
      return
    }

    try {
      const content = readFileSync(fullPath, 'utf-8')
      this.parseEnvContent(content)
    } catch (error) {
      console.warn(`[EnvLoader] 加载 ${envPath} 失败:`, error instanceof Error ? error.message : error)
    }
  }

  /**
   * 解析环境变量文件内容
   */
  private static parseEnvContent(content: string): void {
    for (const line of content.split('\n')) {
      const trimmed = line.trim()

      // 跳过空行和注释行
      if (!trimmed || trimmed.startsWith('#')) {
        continue
      }

      const eqIndex = trimmed.indexOf('=')
      if (eqIndex <= 0) {
        continue // 忽略没有 = 的行
      }

      const key = trimmed.slice(0, eqIndex).trim()
      let value = trimmed.slice(eqIndex + 1).trim()

      // 只有当值不存在于 process.env 中时才设置（优先级：已设置的 env > .env 文件）
      if (!process.env[key]) {
        // 移除引号（支持单引号和双引号）
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1)
        }

        process.env[key] = value
      }
    }
  }
}

/**
 * 快速加载函数 - 直接调用 EnvLoader.load()
 */
export function loadEnv(envPath: string = '.env'): void {
  EnvLoader.load(envPath)
}
