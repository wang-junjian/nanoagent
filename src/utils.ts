import { readdirSync } from 'node:fs'
import { join } from 'node:path'

// ============= 简易 glob 替代 =============
export function simpleGlob(pattern: string, cwd: string = process.cwd()): string[] {
  const results: string[] = []

  function scan(dir: string, base: string = '') {
    try {
      const entries = readdirSync(join(cwd, dir), { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = join(dir, entry.name)
        const relativePath = join(base, entry.name)

        if (entry.isDirectory()) {
          scan(fullPath, relativePath)
        } else {
          let match = false
          if (pattern === '**/*') {
            match = true
          } else if (pattern.endsWith('*')) {
            const ext = pattern.slice(0, -1)
            match = relativePath.startsWith(ext) || relativePath.endsWith(ext.slice(1))
          } else if (pattern.includes('**')) {
            const parts = pattern.split('**')
            match = relativePath.includes(parts[1] || '')
          } else {
            match = relativePath === pattern
          }
          if (match) {
            results.push(relativePath)
          }
        }
      }
    } catch (e) {
      // 忽略无法访问的目录
    }
  }

  scan('.')
  return results
}
