/**
 * 简单的日志系统
 * 提供统一的日志输出接口
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: Date
  data?: Record<string, any>
}

const LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
}

const LEVEL_COLORS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: '\x1b[36m', // cyan
  [LogLevel.INFO]: '\x1b[32m', // green
  [LogLevel.WARN]: '\x1b[33m', // yellow
  [LogLevel.ERROR]: '\x1b[31m', // red
}

const RESET = '\x1b[0m'

class Logger {
  private level: LogLevel = LogLevel.INFO
  private history: LogEntry[] = []
  private maxHistorySize = 1000

  setLevel(level: LogLevel): void {
    this.level = level
  }

  debug(message: string, data?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, data)
  }

  info(message: string, data?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, data)
  }

  warn(message: string, data?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, data)
  }

  error(message: string, data?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, data)
  }

  private log(level: LogLevel, message: string, data?: Record<string, any>): void {
    if (level < this.level) {
      return
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      data,
    }

    this.history.push(entry)
    if (this.history.length > this.maxHistorySize) {
      this.history.shift()
    }

    this.output(entry)
  }

  private output(entry: LogEntry): void {
    const color = LEVEL_COLORS[entry.level]
    const levelName = LEVEL_NAMES[entry.level]
    const timestamp = entry.timestamp.toISOString().slice(11, 19) // HH:MM:SS

    let output = `${color}[${timestamp}]${RESET} ${color}${levelName}${RESET} ${entry.message}`

    if (entry.data && Object.keys(entry.data).length > 0) {
      output += ` ${JSON.stringify(entry.data)}`
    }

    if (entry.level === LogLevel.ERROR || entry.level === LogLevel.WARN) {
      console.error(output)
    } else {
      console.log(output)
    }
  }

  getHistory(): LogEntry[] {
    return [...this.history]
  }

  clearHistory(): void {
    this.history = []
  }
}

export const logger = new Logger()
