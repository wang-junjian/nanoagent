/**
 * 上下文管理模块 - 参考 Claude Code 架构
 *
 * 提供系统提示词管理、上下文窗口管理、消息历史压缩等功能
 *
 * 主要组件：
 * - prompts.ts - 系统提示词定义和组装
 * - context-manager.ts - 消息历史和上下文管理
 * - prompt-assembler.ts - 最终提示词组装
 */

export * from './prompts.js'
export * from './context-manager.js'
export * from './prompt-assembler.js'
