/**
 * 加载动画和进度反馈
 * 提供更好的用户交互反馈体验
 */

import { COLORS } from '../constants/colors.js'

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
const PROGRESS_CHARS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█']

export class Spinner {
  private frameIndex = 0
  private intervalId: NodeJS.Timeout | null = null
  private active = false

  start(message: string = '处理中'): void {
    if (this.active) return

    this.active = true
    this.frameIndex = 0

    this.intervalId = setInterval(() => {
      const frame = SPINNER_FRAMES[this.frameIndex % SPINNER_FRAMES.length]
      process.stdout.write(
        `\r${COLORS.cyan}${frame}${COLORS.reset} ${message}..`
      )
      this.frameIndex++
    }, 100)
  }

  stop(status: 'success' | 'error' | 'info' = 'success'): void {
    if (!this.active) return

    this.active = false
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    const iconMap = {
      success: `${COLORS.green}✓${COLORS.reset}`,
      error: `${COLORS.red}✗${COLORS.reset}`,
      info: `${COLORS.blue}ℹ${COLORS.reset}`
    }

    process.stdout.write(`\r${iconMap[status]} 完成\n`)
  }

  update(message: string): void {
    if (!this.active) return
    const frame = SPINNER_FRAMES[this.frameIndex % SPINNER_FRAMES.length]
    process.stdout.write(
      `\r${COLORS.cyan}${frame}${COLORS.reset} ${message}..`
    )
  }
}

export class ProgressBar {
  private total: number
  private current = 0
  private active = false
  private lastDisplayed = -1

  constructor(total: number) {
    this.total = Math.max(total, 1)
  }

  start(): void {
    this.active = true
    this.current = 0
    this.lastDisplayed = -1
  }

  update(value: number, label: string = ''): void {
    if (!this.active) return
    this.current = Math.min(value, this.total)
    this.render(label)
  }

  increment(label: string = ''): void {
    if (!this.active) return
    this.current++
    this.render(label)
  }

  finish(success = true): void {
    if (!this.active) return
    this.active = false
    const status = success ? `${COLORS.green}✓${COLORS.reset}` : `${COLORS.red}✗${COLORS.reset}`
    process.stdout.write(`\r${status} 完成 [100%]\n`)
  }

  private render(label: string): void {
    const percentage = Math.round((this.current / this.total) * 100)

    // 每个百分点变化时更新显示
    if (Math.floor(percentage / 10) === Math.floor(this.lastDisplayed / 10)) {
      return
    }

    this.lastDisplayed = percentage

    const barLength = 20
    const filled = Math.round((this.current / this.total) * barLength)
    const empty = barLength - filled

    const bar = `${COLORS.green}${'█'.repeat(filled)}${COLORS.reset}${'░'.repeat(empty)}`
    const labelStr = label ? ` ${label}` : ''

    process.stdout.write(
      `\r[${bar}] ${percentage.toString().padStart(3)}%${labelStr}`
    )
  }
}

export class StepIndicator {
  private steps: string[]
  private currentStep = -1

  constructor(steps: string[]) {
    this.steps = steps
  }

  start(step: number | string): void {
    const stepNum = typeof step === 'string' 
      ? this.steps.indexOf(step)
      : step

    if (stepNum < 0 || stepNum >= this.steps.length) {
      return
    }

    this.currentStep = stepNum
    this.render()
  }

  next(): void {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++
      this.render()
    }
  }

  private render(): void {
    if (this.currentStep < 0) return

    const indicators = this.steps.map((step, index) => {
      if (index < this.currentStep) {
        return `${COLORS.green}✓${COLORS.reset} ${step}`
      } else if (index === this.currentStep) {
        return `${COLORS.cyan}→${COLORS.reset} ${COLORS.bright}${step}${COLORS.reset}`
      } else {
        return `${COLORS.dim}○${COLORS.reset} ${COLORS.dim}${step}${COLORS.reset}`
      }
    })

    console.log('\n' + indicators.join('\n'))
  }
}

// 单个全局加载器实例
export const spinner = new Spinner()
