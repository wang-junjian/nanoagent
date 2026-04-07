/**
 * 统一的错误处理系统
 * 提供结构化的错误类和处理方法
 */

export class NanoAgentError extends Error {
  constructor(
    message: string,
    public code: string = 'UNKNOWN_ERROR',
    public details?: Record<string, any>,
  ) {
    super(message)
    this.name = 'NanoAgentError'
    Object.setPrototypeOf(this, NanoAgentError.prototype)
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
    }
  }
}

export class ConfigError extends NanoAgentError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'CONFIG_ERROR', details)
    this.name = 'ConfigError'
    Object.setPrototypeOf(this, ConfigError.prototype)
  }
}

export class ToolExecutionError extends NanoAgentError {
  constructor(
    message: string,
    public toolName: string,
    details?: Record<string, any>,
  ) {
    super(message, 'TOOL_EXECUTION_ERROR', { toolName, ...details })
    this.name = 'ToolExecutionError'
    Object.setPrototypeOf(this, ToolExecutionError.prototype)
  }
}

export class APIError extends NanoAgentError {
  constructor(
    message: string,
    public statusCode: number,
    details?: Record<string, any>,
  ) {
    super(message, 'API_ERROR', { statusCode, ...details })
    this.name = 'APIError'
    Object.setPrototypeOf(this, APIError.prototype)
  }
}

export class ValidationError extends NanoAgentError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', details)
    this.name = 'ValidationError'
    Object.setPrototypeOf(this, ValidationError.prototype)
  }
}

/**
 * 统一的错误处理函数
 */
export function handleError(error: unknown, context: string = 'Unknown'): NanoAgentError {
  if (error instanceof NanoAgentError) {
    return error
  }

  if (error instanceof Error) {
    return new NanoAgentError(error.message, 'RUNTIME_ERROR', {
      context,
      originalError: error.name,
    })
  }

  return new NanoAgentError(String(error), 'UNKNOWN_ERROR', {
    context,
    type: typeof error,
  })
}

/**
 * 安全的异步函数包装
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  errorContext: string = 'Unknown',
): Promise<[T | null, NanoAgentError | null]> {
  try {
    const result = await fn()
    return [result, null]
  } catch (error) {
    return [null, handleError(error, errorContext)]
  }
}

/**
 * 重试机制
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000,
  backoff: number = 2,
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt < maxAttempts) {
        const delay = delayMs * Math.pow(backoff, attempt - 1)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw new NanoAgentError(
    `Failed after ${maxAttempts} attempts: ${lastError?.message || 'Unknown error'}`,
    'MAX_RETRIES_EXCEEDED',
    { attempts: maxAttempts, lastError: lastError?.message },
  )
}
