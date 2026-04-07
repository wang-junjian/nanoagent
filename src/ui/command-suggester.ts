/**
 * 命令建议和自动补全系统
 * 提供更好的命令发现和错误提示
 */

import { COLORS } from '../constants/colors.js'

export interface CommandSuggestion {
  command: string
  score: number /* 0-1 相似度分数 */
  description: string
  reason: string
}

export class CommandSuggester {
  /**
   * Levenshtein 距离 - 用于计算字符串相似度
   */
  private static levenshteinDistance(s1: string, s2: string): number {
    const len1 = s1.length
    const len2 = s2.length
    const matrix: number[][] = Array(len1 + 1)
      .fill(null)
      .map(() => Array(len2 + 1).fill(0))

    for (let i = 0; i <= len1; i++) matrix[i][0] = i
    for (let j = 0; j <= len2; j++) matrix[0][j] = j

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        )
      }
    }

    return matrix[len1][len2]
  }

  /**
   * 计算相似度分数
   */
  private static similarity(s1: string, s2: string): number {
    const maxLen = Math.max(s1.length, s2.length)
    if (maxLen === 0) return 1
    const distance = this.levenshteinDistance(s1.toLowerCase(), s2.toLowerCase())
    return 1 - distance / maxLen
  }

  /**
   * 为未知命令建议相似的命令
   */
  static suggestCommands(
    unknownCommand: string,
    availableCommands: { name: string; description: string }[]
  ): CommandSuggestion[] {
    const suggestions = availableCommands
      .map(cmd => {
        const nameScore = this.similarity(unknownCommand, cmd.name) * 0.7
        const descScore = this.similarity(unknownCommand, cmd.description) * 0.3

        return {
          command: cmd.name,
          score: nameScore + descScore,
          description: cmd.description,
          reason: this.getReasonForSuggestion(unknownCommand, cmd.name)
        }
      })
      .filter(s => s.score > 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)

    return suggestions
  }

  /**
   * 获取建议的原因
   */
  private static getReasonForSuggestion(input: string, command: string): string {
    if (input.length <= 2) {
      return '你可能想使用此命令'
    }

    const inputLower = input.toLowerCase()
    const cmdLower = command.toLowerCase()

    if (cmdLower.startsWith(inputLower)) {
      return `命令以 "${input}" 开头`
    }

    if (inputLower.startsWith(cmdLower.charAt(0))) {
      return '命令首字母相同'
    }

    return '拼写相似'
  }

  /**
   * 显示命令建议
   */
  static displaySuggestions(suggestions: CommandSuggestion[]): void {
    if (suggestions.length === 0) {
      return
    }

    console.log(
      `\n${COLORS.yellow}💡 你可能想使用以下命令:${COLORS.reset}`
    )

    suggestions.forEach((s, index) => {
      const confidence = Math.round(s.score * 100)
      const bar = this.confidenceBar(confidence)
      console.log(`\n  ${index + 1}. ${COLORS.cyan}/${s.command}${COLORS.reset}`)
      console.log(`     ${s.description}`)
      console.log(`     ${bar} ${confidence}% 匹配 - ${COLORS.dim}${s.reason}${COLORS.reset}`)
    })

    console.log()
  }

  /**
   * 生成信心条
   */
  private static confidenceBar(percentage: number): string {
    const filled = Math.round(percentage / 10)
    const empty = 10 - filled

    const colors: Record<string, string> = {
      high: COLORS.green,
      medium: COLORS.yellow,
      low: COLORS.red
    }

    let color = colors.low
    if (percentage >= 70) color = colors.high
    else if (percentage >= 50) color = colors.medium

    return (
      `${color}${'█'.repeat(filled)}${COLORS.dim}${'░'.repeat(empty)}${COLORS.reset}`
    )
  }
}

/**
 * 命令补全器 - 用于交互式补全
 */
export class CommandCompleter {
  /**
   * 获取补全候选
   */
  static getCompletions(partial: string, commands: { name: string }[]): string[] {
    if (!partial.startsWith('/')) {
      return []
    }

    const partialCmd = partial.slice(1).toLowerCase()
    return commands
      .filter(cmd => cmd.name.toLowerCase().startsWith(partialCmd))
      .map(cmd => `/${cmd.name}`)
      .slice(0, 5)
  }

  /**
   * 显示补全建议
   */
  static displayCompletions(completions: string[]): void {
    if (completions.length === 0) return

    console.log(`\n${COLORS.dim}%s建议补全:${COLORS.reset}`)
    completions.forEach(c => {
      console.log(`  ${COLORS.cyan}${c}${COLORS.reset}`)
    })
  }
}

/**
 * 交互式菜单 - 用于命令发现
 */
export class InteractiveMenu {
  /**
   * 显示命令分类菜单
   */
  static showCommandMenu(categories: Record<string, Array<{ name: string; desc: string }>>): void {
    console.log(`\n${COLORS.bright}${COLORS.cyan}命令菜单${COLORS.reset}\n`)

    Object.entries(categories).forEach(([category, commands]) => {
      console.log(`${COLORS.yellow}${category}:${COLORS.reset}`)
      commands.forEach(cmd => {
        console.log(`  ${COLORS.cyan}/${cmd.name}${COLORS.reset} - ${cmd.desc}`)
      })
      console.log()
    })
  }

  /**
   * 显示快速开始指南
   */
  static showQuickStart(): void {
    console.log(`
${COLORS.bright}${COLORS.cyan}╔══════════════════════════════════════╗${COLORS.reset}
${COLORS.bright}${COLORS.cyan}║       🚀 快速开始 Nano Agent       ║${COLORS.reset}
${COLORS.bright}${COLORS.cyan}╚══════════════════════════════════════╝${COLORS.reset}

${COLORS.yellow}第 1 步 - 检查配置:${COLORS.reset}
  ${COLORS.cyan}nanoagent>:reset} /config show

${COLORS.yellow}第 2 步 - 列出可用工具:${COLORS.reset}
  ${COLORS.cyan}nanoagent>${COLORS.reset} /tools

${COLORS.yellow}第 3 步 - 尝试第一个问题:${COLORS.reset}
  ${COLORS.cyan}nanoagent>${COLORS.reset} 列出当前目录的文件

${COLORS.yellow}更多帮助:${COLORS.reset}
  ${COLORS.cyan}/help${COLORS.reset} - 显示所有命令
  ${COLORS.cyan}/skills${COLORS.reset} - 显示可用技能
  ${COLORS.cyan}/troubleshoot${COLORS.reset} - 故障排除指南

${COLORS.dim}要获得更好的体验，请运行 ${COLORS.cyan}/config setup${COLORS.reset}${COLORS.reset}
`)
  }
}
