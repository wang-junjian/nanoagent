# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此仓库中工作时提供指导。

## 概述

本仓库包含 **Nano Agent**，这是从 Claude Code v2.1.88 核心原理提炼而来的极简 AI 智能体实现。代码库包含：
- 交互式 REPL 模式
- 零运行时依赖

## 命令

### 构建命令

```bash
# 使用 tsx 的开发模式
npm run dev

# 构建项目（TypeScript 编译）
npm run build

# 运行编译后的 CLI
npm start
```

## 高层代码架构

### 核心 Agent 循环

应用在 [src/agent.ts:18](src/agent.ts#L18) 中遵循经典的智能体循环模式：

```
用户输入 → NanoAgent.run() → LLM API → 响应
                                   ↓
                           存在 tool_calls 吗？
                         /                  \
                       是                   否
                       |                    |
                    执行工具               返回文本
                    追加 tool_result
                    循环回到 → LLM
```

### 目录结构

关键目录和文件：

- **`src/`** - 源代码
  - **`types.ts`** - 类型定义（Message、ToolDefinition、Config）
  - **`config.ts`** - LLM 配置 + 系统提示词
  - **`utils.ts`** - 工具函数（简易 glob 实现）
  - **`tools.ts`** - 5 个内置工具定义 + OpenAI 格式转换器
  - **`client.ts`** - 兼容 OpenAI 的 API 客户端
  - **`agent.ts`** - 带有主循环的核心 NanoAgent 类
  - **`repl.ts`** - 交互式 REPL 模式
  - **`main.ts`** - CLI 入口点

### 关键文件

| 文件 | 用途 |
|------|------|
| [src/agent.ts](src/agent.ts) | 带有 `run()` 异步生成器的核心 NanoAgent |
| [src/tools.ts](src/tools.ts) | 工具注册表和 OpenAI 格式转换 |
| [src/repl.ts](src/repl.ts) | 带有斜杠命令的交互式 REPL |
| [src/main.ts](src/main.ts) | 支持双模式的 CLI 引导程序 |
| [src/client.ts](src/client.ts) | 兼容 OpenAI 的聊天补全 API |

### 工具系统架构

工具系统通过 `ToolDefinition` 接口使用简单的定义模式。每个工具实现：
- **定义**：`name`、`description`、`params` 模式
- **执行**：返回字符串结果的 `execute()` 异步函数

内置工具：FileRead、FileWrite、Glob、Bash、ListDir

工具通过 [src/tools.ts:99](src/tools.ts#L99) 中的 `toolsToOpenAIFormat()` 转换为 OpenAI 格式。

### REPL 模式

[src/repl.ts](src/repl.ts) 中的 REPL（交互式命令行）模式提供：
- **斜杠命令**：`/help`、`/clear`、`/history`、`/exit`
- **彩色输出**：用于不同消息类型的 ANSI 颜色代码
- **历史记录管理**：查看和清空对话历史
- **信号处理**：Ctrl+C / Ctrl+D 优雅退出

可用的 REPL 命令：
| 命令 | 功能 |
|------|------|
| `/help` | 显示帮助信息 |
| `/clear` | 清空对话历史 |
| `/history` | 查看消息历史 |
| `/exit` | 退出程序（也可用 Ctrl+C 或 Ctrl+D） |

### 消息类型

[src/types.ts:3](src/types.ts#L3) 中的 `Message` 类型支持：
- `system` - 系统提示词
- `user` - 用户输入
- `assistant` - LLM 响应
- `tool` - 工具执行结果（带有 `tool_call_id` 和 `name`）

### 配置

编辑 [src/config.ts](src/config.ts) 以修改 LLM 设置：
- `baseURL` - API 端点（默认：`http://localhost:11434/`）
- `apiKey` - API 密钥（默认：`'NONE'`）
- `model` - 模型名称（默认：`'qwen3.5:9b'`）
- `maxTokens` - 最大上下文 token 数（默认：`256000`）

## 如何添加新工具

1. 在 [src/tools.ts](src/tools.ts) 中，向 `TOOLS` 数组添加新工具定义：

```typescript
{
  name: 'MyNewTool',
  description: '工具描述',
  params: {
    param1: { type: 'string', description: '参数 1 描述', required: true },
    param2: { type: 'number', description: '参数 2 描述', required: false },
  },
  execute: async (args: Record<string, any>) => {
    const { param1, param2 = 42 } = args
    // 实现工具逻辑
    return '工具执行结果'
  },
},
```

2. 工具会自动注册到 Agent 中 — 无需额外配置！
