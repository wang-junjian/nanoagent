/**
 * 格式化输出 - 美化和结构化的输出
 * 提供表格、代码块、段落等多种格式
 */

import { COLORS } from '../constants/colors.js'

export class Formatter {
  /**
   * 打印表格
   */
  static table(headers: string[], rows: string[][]): void {
    const colWidths = headers.map((h, i) => {
      return Math.max(h.length, ...rows.map(r => (r[i] || '').length))
    })

    const separator = (char = '─'): string => {
      return colWidths
        .map(w => char.repeat(w + 2))
        .join('┼')
        .replace(/^┼/, '├')
        .replace(/┼$/, '┤')
    }

    // 标题行
    console.log('┌' + separator().slice(1).slice(0, -1) + '┐')
    console.log(
      '│ ' +
      headers
        .map((h, i) => h.padEnd(colWidths[i], ' '))
        .join(' │ ') +
      ' │'
    )
    console.log('├' + separator().slice(1).slice(0, -1) + '┤')

    // 数据行
    rows.forEach((row, idx) => {
      console.log(
        '│ ' +
        row
          .map((cell, i) => (cell || '').padEnd(colWidths[i], ' '))
          .join(' │ ') +
        ' │'
      )
      if (idx < rows.length - 1) {
        // 行分隔符（可选）
      }
    })

    console.log('└' + separator().slice(1).slice(0, -1) + '┘')
  }

  /**
   * 打印代码块
   */
  static code(code: string, language: string = 'text'): void {
    const lines = code.split('\n')
    const maxLength = Math.max(...lines.map(l => l.length))

    console.log(`${COLORS.dim}┌─ ${language}${COLORS.reset}`)
    lines.forEach(line => {
      const paddedLine = line.padEnd(maxLength, ' ')
      console.log(`${COLORS.dim}│${COLORS.reset} ${COLORS.bright}${paddedLine}${COLORS.reset}`)
    })
    console.log(`${COLORS.dim}└${'─'.repeat(Math.min(maxLength + 4, 70))}${COLORS.reset}`)
  }

  /**
   * 打印高亮的信息框
   */
  static box(title: string, content: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    const colors = {
      info: COLORS.cyan,
      success: COLORS.green,
      warning: COLORS.yellow,
      error: COLORS.red
    }

    const color = colors[type]
    const icons = {
      info: 'ℹ',
      success: '✓',
      warning: '⚠',
      error: '✗'
    }

    const lines = content.split('\n')
    const maxLength = Math.max(title.length, ...lines.map(l => l.length))
    const width = maxLength + 4

    console.log(`${color}╭${'─'.repeat(width)}╮${COLORS.reset}`)
    console.log(`${color}│${COLORS.reset} ${icons[type]} ${COLORS.bright}${title}${COLORS.reset}${' '.repeat(width - title.length - 3)}${color}│${COLORS.reset}`)
    console.log(`${color}├${'─'.repeat(width)}┤${COLORS.reset}`)

    lines.forEach(line => {
      const padding = width - line.length - 2
      console.log(`${color}│${COLORS.reset} ${line}${' '.repeat(Math.max(0, padding))}${color}│${COLORS.reset}`)
    })

    console.log(`${color}╰${'─'.repeat(width)}╯${COLORS.reset}`)
  }

  /**
   * 打印列表
   */
  static list(items: string[], ordered = false): void {
    items.forEach((item, index) => {
      const marker = ordered ? `${index + 1}.` : '•'
      console.log(`  ${COLORS.cyan}${marker}${COLORS.reset} ${item}`)
    })
  }

  /**
   * 打印分界线  
   */
  static divider(char = '─', length = 60): void {
    console.log(`${COLORS.dim}${char.repeat(length)}${COLORS.reset}`)
  }

  /**
   * 打印标题
   */
  static heading(text: string, level: 1 | 2 | 3 = 1): void {
    const styles = {
      1: {
        prefix: `${COLORS.bright}${COLORS.cyan}${'═'.repeat(60)}${COLORS.reset}`,
        format: (t: string) => `${COLORS.bright}${COLORS.cyan}${t}${COLORS.reset}`,
        suffix: `${COLORS.bright}${COLORS.cyan}${'═'.repeat(60)}${COLORS.reset}`
      },
      2: {
        prefix: '',
        format: (t: string) => `${COLORS.bright}${COLORS.yellow}▶ ${t}${COLORS.reset}`,
        suffix: ''
      },
      3: {
        prefix: '',
        format: (t: string) => `${COLORS.bright}• ${t}${COLORS.reset}`,
        suffix: ''
      }
    }

    const style = styles[level]
    if (style.prefix) console.log(style.prefix)
    console.log(style.format(text))
    if (style.suffix) console.log(style.suffix)
  }

  /**
   * 打印键值对
   */
  static keyValue(items: Record<string, string>): void {
    const maxKeyLength = Math.max(...Object.keys(items).map(k => k.length))

    Object.entries(items).forEach(([key, value]) => {
      const padding = maxKeyLength - key.length
      console.log(
        `  ${COLORS.cyan}${key}:${' '.repeat(padding)}${COLORS.reset} ${COLORS.dim}${value}${COLORS.reset}`
      )
    })
  }

  /**
   * 打印 JSON（格式化）
   */
  static json(obj: any, indent = 2): void {
    try {
      const json = JSON.stringify(obj, null, indent)
      // 简单的语法高亮
      console.log(json)
    } catch (e) {
      console.log(String(obj))
    }
  }

  /**
   * 打印树形结构
   */
  static tree(items: TreeItem[], prefix = ''): void {
    items.forEach((item, index) => {
      const isLast = index === items.length - 1
      const connector = isLast ? '└── ' : '├── '
      const nextPrefix = prefix + (isLast ? '    ' : '│   ')

      console.log(`${prefix}${connector}${item.label}`)

      if (item.children && item.children.length > 0) {
        this.tree(item.children, nextPrefix)
      }
    })
  }
}

export interface TreeItem {
  label: string
  children?: TreeItem[]
}

/**
 * 便利函数
 */
export namespace Format {
  export function bold(text: string): string {
    return `${COLORS.bright}${text}${COLORS.reset}`
  }

  export function dim(text: string): string {
    return `${COLORS.dim}${text}${COLORS.reset}`
  }

  export function success(text: string): string {
    return `${COLORS.green}${text}${COLORS.reset}`
  }

  export function error(text: string): string {
    return `${COLORS.red}${text}${COLORS.reset}`
  }

  export function warning(text: string): string {
    return `${COLORS.yellow}${text}${COLORS.reset}`
  }

  export function info(text: string): string {
    return `${COLORS.cyan}${text}${COLORS.reset}`
  }

  export function highlight(text: string): string {
    return `${COLORS.bright}${COLORS.yellow}${text}${COLORS.reset}`
  }

  export function code(text: string): string {
    return `${COLORS.dim}\`${text}\`${COLORS.reset}`
  }

  export function duration(milliseconds: number): string {
    if (milliseconds < 1000) {
      return `${milliseconds}ms`
    } else if (milliseconds < 60000) {
      return `${(milliseconds / 1000).toFixed(2)}s`
    } else {
      return `${(milliseconds / 60000).toFixed(2)}min`
    }
  }

  export function bytes(size: number): string {
    const units = ['B', 'KB', 'MB', 'GB']
    let value = size
    let unitIndex = 0

    while (value > 1024 && unitIndex < units.length - 1) {
      value /= 1024
      unitIndex++
    }

    return `${value.toFixed(2)} ${units[unitIndex]}`
  }
}
