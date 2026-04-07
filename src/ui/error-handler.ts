/**
 * 增强的错误处理和诊断系统
 * 提供友好的错误消息和恢复建议
 */

import { COLORS } from '../constants/colors.js'
import { NanoAgentError, APIError, ToolExecutionError, ConfigError } from '../errors.js'

export interface DiagnosticInfo {
  error: Error
  context: string
  suggestions: string[]
  recoverable: boolean
}

export class ErrorDiagnostics {
  private static readonly COMMON_ERRORS: Record<string, DiagnosticInfo> = {
    'ECONNREFUSED': {
      error: new Error('连接被拒绝'),
      context: '无法连接到API服务',
      suggestions: [
        '检查API服务地址是否正确',
        '确认API服务是否正在运行',
        '检查防火墙设置',
        '验证网络连接'
      ],
      recoverable: true
    },
    'ENOTFOUND': {
      error: new Error('DNS 查询失败'),
      context: '无法解析主机名',
      suggestions: [
        '检查网络连接',
        '验证API地址拼写',
        '检查DNS设置'
      ],
      recoverable: true
    },
    'TIMEOUT': {
      error: new Error('操作超时'),
      context: '请求耗时过长',
      suggestions: [
        '检查网络连接速度',
        '尝试减少tokens数量',
        '检查API服务状态',
        '稍后重试'
      ],
      recoverable: true
    },
    'CONFIG_MISSING': {
      error: new Error('配置不完整'),
      context: '缺少必需的配置参数',
      suggestions: [
        '运行 /config show 查看当前配置',
        '检查 .env 文件是否存在',
        '使用 /config setup 初始化配置'
      ],
      recoverable: true
    }
  }

  static diagnose(error: unknown, context: string = ''): DiagnosticInfo {
    // 如果已经是 NanoAgentError，直接返回诊断信息
    if (error instanceof APIError) {
      return this.diagnoseAPIError(error)
    }

    if (error instanceof ToolExecutionError) {
      return this.diagnoseToolError(error)
    }

    if (error instanceof ConfigError) {
      return this.diagnoseConfigError(error)
    }

    if (error instanceof Error) {
      return this.diagnoseStandardError(error, context)
    }

    return {
      error: new Error(String(error)),
      context: context || '未知错误',
      suggestions: ['请检查日志文件以获取更多信息'],
      recoverable: false
    }
  }

  static display(diagnostic: DiagnosticInfo): void {
    const { error, context, suggestions, recoverable } = diagnostic

    console.log(`\n${COLORS.red}${'═'.repeat(60)}${COLORS.reset}`)
    console.log(`${COLORS.red}❌ 错误${COLORS.reset}`)
    console.log(`${COLORS.red}${'═'.repeat(60)}${COLORS.reset}`)

    console.log(`\n${COLORS.bright}错误信息:${COLORS.reset}`)
    console.log(`  ${error.message}`)

    if (context) {
      console.log(`\n${COLORS.bright}发生在:${COLORS.reset}`)
      console.log(`  ${COLORS.dim}${context}${COLORS.reset}`)
    }

    if (suggestions.length > 0) {
      console.log(`\n${COLORS.yellow}💡 建议解决方案:${COLORS.reset}`)
      suggestions.forEach((suggestion, index) => {
        console.log(`  ${index + 1}. ${suggestion}`)
      })
    }

    if (recoverable) {
      console.log(`\n${COLORS.green}✓ 此错误可恢复，请尝试建议的解决方案。${COLORS.reset}`)
    } else {
      console.log(`\n${COLORS.yellow}⚠ 此错误可能需要手动干预。${COLORS.reset}`)
    }

    console.log(`\n${COLORS.red}${'═'.repeat(60)}${COLORS.reset}`)
  }

  private static diagnoseAPIError(error: APIError): DiagnosticInfo {
    const messages: Record<number, string> = {
      400: '请求格式错误，检查输入参数',
      401: '认证失败，请检查 API Key',
      403: '访问被拒绝，检查权限',
      429: '请求过于频繁，请稍候后重试',
      500: 'API 服务器内部错误，请稍候重试',
      502: 'API 网关错误，请检查服务状态',
      503: 'API 服务暂时不可用'
    }

    const message = messages[error.statusCode] || 'API 请求失败'

    return {
      error,
      context: `API 请求失败 (状态码: ${error.statusCode})`,
      suggestions: [
        message,
        '检查 /config show 中的 BASE_URL 和 API_KEY',
        '查看 https://status.example.com 服务状态',
        '稍后重试'
      ],
      recoverable: error.statusCode >= 500 || error.statusCode === 429
    }
  }

  private static diagnoseToolError(error: ToolExecutionError): DiagnosticInfo {
    return {
      error,
      context: `工具执行失败: ${error.toolName}`,
      suggestions: [
        `检查工具 '${error.toolName}' 的参数是否正确`,
        `运行 /tools 查看所有可用工具和说明`,
        `查看错误详情: ${error.details?.reason || '未提供'}`,
        '尝试简化输入或分步执行'
      ],
      recoverable: true
    }
  }

  private static diagnoseConfigError(error: ConfigError): DiagnosticInfo {
    return {
      error,
      context: '配置错误',
      suggestions: [
        '运行 /config setup 进行配置向导',
        '检查 .env 文件',
        '确保所有必需的环境变量已设置',
        '查看 .env.example 获取配置示例'
      ],
      recoverable: true
    }
  }

  private static diagnoseStandardError(
    error: Error,
    context: string
  ): DiagnosticInfo {
    const message = error.message.toLowerCase()

    // 尝试匹配常见错误
    for (const [key, diagnostic] of Object.entries(this.COMMON_ERRORS)) {
      if (message.includes(key.toLowerCase())) {
        return diagnostic
      }
    }

    // 如果是文件错误
    if (message.includes('enoent') || message.includes('no such file')) {
      return {
        error,
        context: context || '文件不存在',
        suggestions: [
          '检查文件路径是否正确',
          '确保文件存在',
          '使用相对路径或绝对路径'
        ],
        recoverable: true
      }
    }

    // 如果是权限错误
    if (message.includes('eacces') || message.includes('permission denied')) {
      return {
        error,
        context: context || '权限不足',
        suggestions: [
          '检查文件权限',
          '尝试使用 chmod 修改权限',
          '确保有读/写权限'
        ],
        recoverable: true
      }
    }

    return {
      error,
      context: context || '发生错误',
      suggestions: [
        '检查输入是否有效',
        '查看完整错误日志',
        '重试操作'
      ],
      recoverable: false
    }
  }
}

/**
 * 显示常见问题信息
 */
export function showTroubleshootingTips(topic: string): void {
  const tips: Record<string, string[]> = {
    'config': [
      '配置文件位置: .env',
      '必需的环境变量:',
      '  - BASE_URL: API 服务地址',
      '  - API_KEY: API 认证密钥',
      '  - MODEL: 模型名称',
      '  - MAX_TOKENS: 最大令牌数',
      '',
      '快速设置:',
      '  1. cp .env.example .env',
      '  2. 编辑 .env 并填入你的配置',
      '  3. 运行 /config verify'
    ],
    'api': [
      '常见 API 问题:',
      '',
      '连接失败?',
      '  检查 BASE_URL 是否正确',
      '  验证 API 服务是否运行',
      '',
      '认证错误?',
      '  确认 API_KEY 是否正确',
      '  检查 API_KEY 是否过期',
      '',
      '请求超时?',
      '  减少 MAX_TOKENS 值',
      '  检查网络连接', 
      '  尝试更小的输入'
    ],
    'tools': [
      '工具系统信息:',
      '',
      '查看所有工具: /tools',
      '工具帮助: /tools <tool-name>',
      '',
      '常见工具:',
      '  file_read - 读取文件',
      '  file_write - 写入文件',
      '  bash - 执行 Shell 命令',
      '  search - 搜索内容'
    ]
  }

  const content = tips[topic.toLowerCase()]
  if (!content) {
    console.log(`${COLORS.yellow}未找到主题: ${topic}${COLORS.reset}`)
    return
  }

  console.log(`\n${COLORS.cyan}${'═'.repeat(40)}`)
  console.log(`${COLORS.bright}${COLORS.cyan}${topic.toUpperCase()} - 故障排除${COLORS.reset}`)
  console.log(`${COLORS.cyan}${'═'.repeat(40)}${COLORS.reset}\n`)

  content.forEach(line => console.log(line))
  console.log()
}
