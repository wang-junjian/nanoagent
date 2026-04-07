# Nano Agent

> 基于 Claude Code 核心原理的最简智能体实现

**当前版本**: v1.1.1 | **最后更新**: 2026-04-06

## 概述

Nano Agent 是一个极简的 AI 智能体实现，它从 Claude Code v2.1.88 的源码中提炼出核心工作原理，用 TypeScript 重写为一个可独立运行的项目。

本项目借鉴 Claude Code 项目的设计，提供了完整的工具系统、专业的系统提示词、以及完善的命令/技能系统。

## 核心特性

- 🎯 **Agent 循环** - 用户输入 → LLM → 工具执行 → 回到 LLM
- 🔧 **可扩展工具系统** - 内置 10 个实用工具，易于添加新工具
- 💬 **消息历史管理** - 完整的对话上下文保留
- ⚡ **异步生成器输出** - 实时流式响应
- 🖥️ **交互式 REPL 模式** - 类似 Claude Code 的命令行界面
- 📦 **零运行时依赖** - 仅使用 Node.js 内置模块
- 📝 **完整系统提示词** - 借鉴 Claude Code 的 6 个核心章节
- ⚙️ **CLAUDE.md 配置** - 支持 Claude Code 的 AI 工程最佳实践
- 🚀 **双层技能系统** - 内置 3 个实用技能 + 用户自定义技能
- 🔄 **命令系统** - 本地命令和提示词命令的统一管理

## 快速开始

### 前置要求

- Node.js >= 18.0.0
- 一个兼容 OpenAI API 的 LLM 服务（如 Ollama、vLLM 等）

### 安装

```bash
cd nanoagent
npm install
```

### 配置

复制 `.env.example` 为 `.env` 并修改你的 LLM 配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
BASE_URL=http://localhost:11434/      # 你的 API 地址
API_KEY=NONE                             # API Key
MODEL=qwen3.5:9b                         # 模型名称
MAX_TOKENS=256000
```

### 运行

Nano Agent 支持两种运行模式：

#### 1. 交互式 REPL 模式（推荐）

```bash
# 进入交互式命令行界面
npm run dev
```

在 REPL 模式中，你可以：
- 连续对话，上下文自动保留
- 使用斜杠命令控制会话
- 体验类似 Claude Code 的交互方式

#### 2. 单次执行模式

```bash
# 开发模式（使用 tsx 直接运行 TypeScript）
npm run dev "列出当前目录的文件"

# 编译为 JavaScript
npm run build

# 生产模式运行
npm start "读取 package.json"
```

### REPL 命令

在交互式模式中可用的命令：

| 命令 | 功能 |
|------|------|
| `/help` | 显示帮助信息 |
| `/clear` | 清空对话历史，开始新会话 |
| `/history` | 查看当前对话的消息历史 |
| `/exit` | 退出程序 (也可用 Ctrl+C 或 Ctrl+D) |
| `/skills` | 列出所有可用的技能 |

### 技能系统

Nano Agent 支持技能（Skill）系统，技能是预定义的任务模板。技能通过**渐进式展开**的方式工作：当你输入 `/技能名` 时，技能内容会直接展开到对话中。

### 内置技能

Nano Agent 提供了多个内置技能：

| 技能 | 说明 | 使用场景 |
|------|------|----------|
| **commit** | 执行 git commit 操作，帮助提交代码更改 | 当用户想要提交代码更改时使用 |
| **simplify** | 审查更改的代码，检查复用性、质量和效率 | 当用户想要审查和清理代码更改时使用 |
| **remember** | 审查项目配置文件，帮助管理项目约定 | 当用户想要审查或管理项目配置时使用 |

### 如何使用技能

在 REPL 模式中：

```bash
# 列出所有可用技能
/skills

# 直接使用技能（渐进式展开）
/commit "提交信息"
/simplify
/remember
```

**技能渐进式展开**：当你输入 `/技能名` 时，技能内容会直接展开为用户消息，然后继续执行 Agent 循环。这种方式比通过 Skill 工具调用更自然。

### 创建自定义技能

在 `.claude/skills/` 目录下创建技能目录，每个技能目录包含一个 `SKILL.md` 文件：

```
.claude/skills/
└── my-skill/
    └── SKILL.md
```

### SKILL.md 格式

技能文件使用 YAML frontmatter + Markdown 内容的格式：

```markdown
---
name: 技能名称
description: 技能描述
when-to-use: 何时使用此技能
allowed-tools: ["工具1", "工具2"]
model: 可选的模型覆盖
user-invocable: true
---

# 技能标题

技能的详细提示内容...

参数: $ARGUMENTS
```

### 技能架构

Nano Agent 的技能系统支持两种类型的技能：

1. **内置技能** - 用 TypeScript 编写，在 `src/skills/bundled/` 目录中定义
2. **用户自定义技能** - 用 Markdown 编写，在 `.claude/skills/` 目录中定义

内置技能可以通过 `registerBundledSkill()` 函数注册，支持动态生成提示内容。

### 内置工具

### FileRead
读取文件内容。

**参数：**
- `file_path` (string, 必需) - 要读取的文件路径

### FileWrite
创建新文件或完全覆盖现有文件。

**参数：**
- `file_path` (string, 必需) - 要写入的文件路径
- `content` (string, 必需) - 要写入的内容

### FileEdit
编辑文件内容，通过替换旧字符串为新字符串。借鉴自 Claude Code 的 `FileEditTool`。

**参数：**
- `file_path` (string, 必需) - 要编辑的文件路径
- `old_string` (string, 必需) - 要替换的旧字符串
- `new_string` (string, 必需) - 替换后的新字符串
- `replace_all` (boolean, 可选) - 是否替换所有匹配项（默认只替换第一个）

### Glob
搜索匹配模式的文件。

**参数：**
- `pattern` (string, 必需) - glob 模式 (例如: `*.js`, `**/*.ts`)

### Grep
在文件内容中搜索正则表达式匹配。借鉴自 Claude Code 的 `GrepTool`。

**参数：**
- `pattern` (string, 必需) - 要搜索的正则表达式模式
- `path` (string, 可选) - 要搜索的文件或目录路径（默认为当前目录）
- `output_mode` (string, 可选) - 输出模式: `content`（显示匹配行）或 `files_with_matches`（只显示文件名）

### Bash
执行 shell 命令。

**参数：**
- `command` (string, 必需) - 要执行的 shell 命令

### ListDir
列出目录内容。

**参数：**
- `path` (string, 可选) - 目录路径 (默认为 `.`)

### AskUserQuestion
向用户询问问题并获取回答。借鉴自 Claude Code 的 `AskUserQuestionTool`。

**参数：**
- `question` (string, 必需) - 要问用户的问题

### Skill
执行一个技能（skill），技能是预定义的任务模板。

**参数：**
- `skill` (string, 必需) - 技能名称
- `args` (string, 可选) - 传递给技能的参数

### ListSkills
列出所有可用的技能。

**参数：** 无

## 命令和技能系统架构

Nano Agent 提供了一个完善的命令和技能系统，支持两种不同类型的功能。

### 📋 Command（命令）系统

**定义**: REPL 中以 `/` 开头的命令，直接执行操作或转换用户输入。

#### Command 的两种类型

**1. LocalCommand - 本地执行命令**
- 直接在 Node.js 中执行的 JavaScript 代码
- 调用 REPL 相关功能（如清空历史、显示帮助）
- 例如: `/help`, `/clear`, `/history`, `/exit`

**2. PromptCommand - 提示词命令** 
- 转换为 LLM 提示词的命令
- 输入被扩展后传给 Agent 处理
- 例如: `/summarize "内容"`, `/refine`, `/explain`

#### Command 特性
- 支持别名 (aliases) - 如 `/help` 的别名 `/?` 和 `/h`
- 支持条件启用 (isEnabled) 
- 可以隐藏 (isHidden)
- 支持参数提示 (argumentHint)

### 🚀 Skill（技能）系统

**定义**: 可重复使用的提示词模板，支持参数替换和工具访问控制。

#### Skill 的两种来源

**1. 内置技能 (Bundled Skills)**
- 用 TypeScript 编写
- 位置: `src/skills/bundled/`
- 内置示例: commit、simplify、remember
- 支持动态提示词生成

**2. 用户自定义技能 (User-defined Skills)**
- 用 Markdown 编写  
- 位置: `.claude/skills/`
- 格式: 带 YAML frontmatter 的 Markdown 文件
- 支持动态加载和配置

#### Skill 特性
- YAML frontmatter 配置
- 参数替换 ($ARGUMENTS 或 ${ARGUMENTS})
- 工具访问控制 (allowed-tools)
- 模型选择 (model) - 可以为此技能指定特定模型
- 用户可调用标志 (user-invocable) - 控制用户是否可直接使用

### 🔄 Command vs Skill 对比

| 特性 | Command | Skill |
|------|---------|-------|
| 触发方式 | `/command [args]` | `/skillname [args]` |
| 执行位置 | Local: Node.js / Prompt: LLM | LLM |
| 定义方式 | 代码定义 | 代码或 Markdown 定义 |
| 参数处理 | args 数组或字符串 | 文本替换 ($ARGUMENTS) |
| 使用场景 | REPL 操作 | LLM 任务模板 |
| 执行流程 | 直接执行或展开为提示词 | 渐进式展开到 Agent 循环 |

### 📊 执行流程

**Command 处理流程:**
```
用户输入: /command args
    ↓
判断是否为斜杠命令
    ↓
查找 CommandRegistry 中的命令
    ↓
检查命令是否启用
    ↓
执行命令 (LocalCommand) 或展开为提示词 (PromptCommand)
    ↓
如果是 PromptCommand，展开后继续 Agent 循环
```

**Skill 执行流程:**
```
用户输入: /skillname args
    ↓
检查 CommandRegistry 中是否有此命令 
    ↓
命令不存在 → 检查是否是 Skill
    ↓
加载 Skill 内容 (bundled 或 user-defined)
    ↓
替换参数 ($ARGUMENTS)
    ↓
将展开后的内容作为用户消息
    ↓
继续 Agent 循环 → LLM → 工具执行
```

## 如何添加新工具

1. 在 [`src/tools/`](src/tools/) 目录中创建新的工具类，继承自 `Tool` 基类：

```typescript
// src/tools/my-tool.ts
import { Tool } from '../tool-system.js'
import { ToolExecutionError } from '../errors.js'

export class MyNewTool extends Tool {
  name = 'MyNewTool'
  description = '工具描述'

  params = {
    param1: { type: 'string' as const, description: '参数1描述', required: true },
    param2: { type: 'number' as const, description: '参数2描述', required: false },
  }

  async execute(args: Record<string, any>): Promise<string> {
    const { param1, param2 = 42 } = args
    try {
      // 实现工具逻辑
      return '工具执行结果'
    } catch (error) {
      throw new ToolExecutionError(
        `工具执行失败: ${error instanceof Error ? error.message : String(error)}`,
        this.name,
      )
    }
  }
}
```

2. 在 [`src/tools/index.ts`](src/tools/index.ts) 中注册新工具：

```typescript
import { MyNewTool } from './my-tool.js'

export function initializeTools(): void {
  registerTools(
    // ... 现有工具
    new MyNewTool(),
  )
}
```

## 如何添加新内置技能

1. 在 [`src/skills/bundled/`](src/skills/bundled/) 目录中创建新的技能文件：

```typescript
// src/skills/bundled/my-skill.ts
import { registerBundledSkill } from '../skills.js'

const MY_SKILL_PROMPT = `# 我的技能

技能的详细说明...

用户参数: $ARGUMENTS
`

export function registerMySkill(): void {
  registerBundledSkill({
    name: 'my-skill',
    description: '技能描述',
    whenToUse: '何时使用此技能',
    allowedTools: ['Bash', 'FileRead'],
    userInvocable: true,
    getPrompt: (args: string) => {
      let prompt = MY_SKILL_PROMPT
      if (args) {
        prompt += `\n## 用户提供的额外说明\n\n${args}`
      }
      return prompt
    },
  })
}
```

2. 在 [`src/skills/bundled/index.ts`](src/skills/bundled/index.ts) 中注册新技能：

```typescript
import { registerMySkill } from './my-skill.js'

export function initBundledSkills(): void {
  // ... 现有技能
  registerMySkill()
}
```

### 技能渐进式展开原理

Nano Agent 的技能系统借鉴 Claude Code 的设计，采用**渐进式展开**方式：

```
用户输入 "/commit 提交信息"
    ↓
检测到是技能 (以 / 开头)
    ↓
加载技能内容，替换参数 ($ARGUMENTS)
    ↓
将展开后的内容作为用户消息
    ↓
继续 Agent 循环 → LLM → 工具执行
```

这种方式的优点：
- 更自然：用户直接使用 `/技能名`，不需要额外的工具调用
- 更高效：技能内容直接展开，减少一次 LLM 往返
- 更灵活：可以在技能展开后继续自然对话

## 核心工作原理

### Agent 循环流程图

```mermaid
graph TD
    Start([用户输入]) --> Init[1.追加 User Message 到 messages 数组]
    Init --> LoopStart{2.进入 Agent 主循环<br>当前迭代次数 < 10?}

    LoopStart -- 否 --> MaxHit([抛出异常: 超过最大迭代次数限制])
    LoopStart -- 是 --> CallLLM[3.调用 LLM API<br>传入 messages & tools]

    CallLLM --> AppendAssistant[4.将 LLM 的完整响应<br>Assistant Message 追加到 messages 数组]

    AppendAssistant --> CheckTools{5.检查响应内容:<br>stop_reason == tool_use?}

    CheckTools -- 否 --> End([8.结束循环，返回最终自然语言结果])

    CheckTools -- 是 --> ExecTools[6.提取 tool_calls<br>并在本地执行工具 tool.execute]

    ExecTools --> AppendToolResult[7.将工具执行结果 tool_result<br>追加到 messages 数组]

    AppendToolResult --> |迭代次数 +1| LoopStart

    %% 样式定义 (放到最后通常更稳定)
    classDef startEnd fill:#f9f,stroke:#33,stroke-width:2px;
    classDef process fill:#bbf,stroke:#33,stroke-width:1px;
    classDef condition fill:#fdb,stroke:#33,stroke-width:1px;

    class Start,MaxHit,End startEnd;
    class Init,CallLLM,AppendAssistant,ExecTools,AppendToolResult process;
    class LoopStart,CheckTools condition;
```

### 与 Claude Code 核心原理对比

| 组件 | Claude Code | Nano Agent | 文件位置 |
|------|-------------|------------|----------|
| 主循环 | `queryLoop()` | `NanoAgent.run()` | [`src/agent.ts:18`](src/agent.ts#L18) |
| 消息历史 | `mutableMessages[]` | `messages[]` | [`src/agent.ts:8`](src/agent.ts#L8) |
| 工具系统 | `Tool` 接口 | `ToolDefinition` 接口 | [`src/types.ts:16`](src/types.ts#L16) |
| 工具执行 | `runTools()` + `StreamingToolExecutor` | 直接在循环中执行 | [`src/agent.ts:51`](src/agent.ts#L51) |
| API 调用 | `callModel()` | `chatCompletions()` | [`src/client.ts:11`](src/client.ts#L11) |
| 格式转换 | OpenAI 工具格式 | `toolsToOpenAIFormat()` | [`src/tools.ts:240`](src/tools.ts#L240) |
| **REPL 模式** | **`launchRepl()` + `REPL.tsx`** | **`REPL` 类** | **[`src/repl.ts`](src/repl.ts)** |

### REPL 模式设计

Nano Agent 的 REPL（交互式命令行）模式借鉴了 Claude Code 的设计理念：

| 特性 | 说明 | 借鉴自 Claude Code |
|------|------|-------------------|
| **斜杠命令** | `/help`, `/clear`, `/history`, `/exit` | `src/commands.ts` 中的斜杠命令系统 |
| **颜色输出** | ANSI 颜色代码区分不同角色 | Claude Code 的 Ink/React 终端 UI |
| **历史管理** | 查看和清空对话历史 | Claude Code 的会话历史系统 |
| **信号处理** | Ctrl+C / Ctrl+D 优雅退出 | Claude Code 的信号处理 |
| **双模式** | 交互式 REPL + 单次执行 | Claude Code 的 CLI + SDK 模式 |

REPL 实现使用 Node.js 内置的 `readline` 模块，无需额外依赖：

```typescript
// src/repl.ts 核心结构
class REPL {
  rl: Interface           // readline 接口
  agent: NanoAgent        // Agent 实例

  start()                 // 启动 REPL
  processInput()          // 处理用户输入
  printHelp()             // 显示帮助
  printHistory()          // 显示历史
  clearHistory()          // 清空历史
}
```

### 简化的部分

为了保持"最简"，Nano Agent 移除了 Claude Code 中的复杂特性：

| 特性 | Claude Code | Nano Agent | 原因 |
|------|-------------|------------|------|
| 上下文压缩 | ✅ snip/microcompact/autocompact | ❌ | 简版不需要 |
| 权限系统 | ✅ `canUseTool` + hooks | ❌ | 本地运行不需要 |
| Hook 系统 | ✅ UserPromptSubmit/PostSampling/Stop | ❌ | 增加复杂度 |
| 流式工具执行 | ✅ `StreamingToolExecutor` | ❌ | 简版同步执行即可 |
| 子代理 | ✅ fork/worktree/remote | ❌ | 单智能体足够 |
| 提示词缓存 | ✅ global/session 缓存 | ❌ | 简版不需要 |
| 预算追踪 | ✅ token budget + max turns | ⚠️ 仅 max turns | 简化实现 |

## 项目结构

```
nanoagent/
├── package.json              # NPM 配置
├── tsconfig.json             # TypeScript 配置
├── CLAUDE.md                 # Claude Code 项目配置
├── README.md                 # 本文档
└── src/
    ├── types.ts             # 类型定义
    │   ├─ Message           # 消息类型
    │   ├─ ToolDefinition    # 工具定义接口
    │   ├─ ToolParam         # 工具参数接口
    │   └─ Config            # 配置类型
    │
    ├── config.ts            # 配置 + 系统提示词
    │   ├─ CONFIG            # LLM 配置对象
    │   └─ SYSTEM_PROMPT     # 完整系统提示词（6个核心章节）
    │
    ├── utils.ts             # 工具函数
    │   └─ simpleGlob        # 简易 glob 实现
    │
    ├── tools.ts             # 工具定义 + 实现
    │   ├─ TOOLS[]           # 工具数组（8个内置工具）
    │   ├─ FileRead          # 读取文件
    │   ├─ FileWrite         # 写入文件
    │   ├─ FileEdit          # 编辑文件
    │   ├─ Glob              # 搜索文件
    │   ├─ Grep              # 内容搜索
    │   ├─ Bash              # 执行 Shell 命令
    │   ├─ ListDir           # 列出目录
    │   ├─ AskUserQuestion   # 询问用户
    │   └─ toolsToOpenAIFormat()
    │
    ├── client.ts            # API 客户端
    │   └─ chatCompletions() # 调用 LLM API
    │
    ├── agent.ts             # Agent 主类
    │   └─ NanoAgent         # 核心 Agent 实现
    │      ├─ constructor()  # 初始化，添加 system message
    │      ├─ findTool()     # 根据名称查找工具
    │      └─ run()          # 主循环 (AsyncGenerator)
    │
    ├── repl.ts              # 交互式 REPL
    │   └─ REPL              # REPL 类
    │      ├─ start()         # 启动 REPL
    │      ├─ printBanner()   # 显示欢迎横幅
    │      ├─ processInput()  # 处理用户输入
    │      ├─ printHelp()     # 显示帮助
    │      ├─ printHistory()  # 显示对话历史
    │      └─ clearHistory()  # 清空对话历史
    │
    └── main.ts              # CLI 入口
       └─ main()             # 解析命令行参数，启动 REPL 或单次执行
```

## 使用示例

### 示例 1: 列出目录

```bash
npm run dev "列出当前目录的内容"
```

输出：
```
🤖 Nano Agent 正在处理...
════════════════════════════════════════════════════════════

[迭代 1/10]

[调用工具: ListDir({"path":"."})]

[工具结果]
[DIR]   src
[FILE]  package.json
[FILE]  tsconfig.json
[FILE]  README.md

[迭代 2/10]

当前目录包含以下内容：
- src/ - 源代码目录
- package.json - 项目配置文件
- tsconfig.json - TypeScript 配置文件
- README.md - 项目文档

════════════════════════════════════════════════════════════
✅ 完成
```

### 示例 2: 读取并分析文件

```bash
npm run dev "读取 package.json 并告诉我这个项目是做什么的"
```

### 示例 3: 创建文件

```bash
npm run dev "创建一个 hello.txt 文件，内容是 'Hello World'"
```

## 核心代码解读

### Agent 主循环

[`src/agent.ts:18`](src/agent.ts#L18) 中的 `run()` 方法是核心：

```typescript
async *run(userInput: string): AsyncGenerator<string, void, unknown> {
  // 1. 添加用户消息
  this.messages.push({ role: 'user', content: userInput })

  let iteration = 0
  const maxIterations = 10

  // 2. 主循环
  while (iteration < maxIterations) {
    iteration++

    // 3. 调用 LLM
    const response = await chatCompletions({
      messages: this.messages,
      tools: toolsToOpenAIFormat(TOOLS),
    })

    // 4. 处理响应
    const assistantMessage = response.choices[0].message
    this.messages.push({
      role: 'assistant',
      content: assistantMessage.content || '',
    })

    // 5. 检查是否需要工具调用
    const toolCalls = assistantMessage.tool_calls
    if (!toolCalls || toolCalls.length === 0) {
      break // 没有工具调用，结束
    }

    // 6. 执行工具
    for (const toolCall of toolCalls) {
      const tool = this.findTool(toolCall.function.name)
      const args = JSON.parse(toolCall.function.arguments)
      const result = await tool.execute(args)

      // 7. 添加工具结果
      this.messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        name: tool.name,
        content: result,
      })
    }
  }
}
```

## 系统提示词架构

借鉴 Claude Code 源码，[`src/config.ts`](src/config.ts) 中的系统提示词包含 6 个核心章节：

| 章节 | 说明 |
|------|------|
| **System** | 系统基础说明（输出渲染、工具权限、系统标签） |
| **Doing tasks** | 任务执行指南（软件工程原则、代码风格、验证标准） |
| **Executing actions with care** | 谨慎执行操作（高风险确认、破坏性操作清单、障碍处理） |
| **Using your tools** | 工具使用规则（专用工具优先、并行调用建议） |
| **Tone and style** | 语气和风格（表情符号、代码引用格式） |
| **Output efficiency** | 输出效率（简洁直接、重点关注内容） |

## 技术栈

- **TypeScript 5.0+** - 类型安全
- **ES2022** - 现代 JavaScript 特性
- **Node.js 内置模块** - `fs`, `child_process`, `path`, `url`, `util`, `readline`
- **tsx** - TypeScript 运行时 (开发依赖)
- **零运行时依赖** - 生产环境不需要任何外部包

## 常见问题

### Q: 如何修改模型配置？

A: 编辑 `.env` 文件中的环境变量。

### Q: 可以用 OpenAI 的官方 API 吗？

A: 可以！只需修改 `.env` 文件：

```env
BASE_URL=https://api.openai.com/v1/
API_KEY=sk-your-api-key-here
MODEL=gpt-4
MAX_TOKENS=256000
```

### Q: 如何增加最大迭代次数？

A: 修改 [`src/agent.ts:23`](src/agent.ts#L23) 中的 `maxIterations`。

## 学习资源

想要了解 Claude Code 的完整实现？查看父目录的源码：

- [`src/query.ts`](../src/query.ts) - 主 Agent 循环
- [`src/QueryEngine.ts`](../src/QueryEngine.ts) - 会话管理
- [`src/Tool.ts`](../src/Tool.ts) - 工具系统接口
- [`src/tools/`](../src/tools/) - 40+ 内置工具实现

## 许可证

本项目基于 Claude Code v2.1.88 的反编译源码进行学习和研究。仅供技术研究、学习和教育交流使用。

---

**享受构建智能体的乐趣！** 🎉
