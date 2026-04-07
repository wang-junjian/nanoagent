import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { registerBundledSkill } from '../../skills.js'

const REMEMBER_SKILL_PROMPT = `# Memory Review

## 目标

审查项目的配置文件，帮助用户管理项目约定。

## 步骤

### 1. 收集信息

读取项目根目录的 CLAUDE.md（如果存在）。

**成功标准**：你有所有配置文件的内容。

### 2. 审查内容

审查配置文件内容，了解项目约定和说明。

### 3. 提供建议

根据你的任务是：
1. 总结当前的项目约定
2. 如果没有 CLAUDE.md，询问用户是否需要创建
3. 建议可以添加到配置文件中的有用约定

## 规则

- 在进行任何更改之前先展示所有建议
- 未经用户明确批准不要修改文件
- 除非目标不存在，不要创建新文件

用户提供的额外说明: $ARGUMENTS
`

export function registerRememberSkill(): void {
  registerBundledSkill({
    name: 'remember',
    description: '审查项目配置文件，帮助管理项目约定和说明',
    whenToUse: '当用户想要审查或管理项目配置时使用',
    allowedTools: ['FileRead', 'FileWrite', 'AskUserQuestion'],
    userInvocable: true,
    getPrompt: (args: string) => {
      let prompt = REMEMBER_SKILL_PROMPT

      // 检查 CLAUDE.md 是否存在
      const claudeMdPath = join(process.cwd(), 'CLAUDE.md')
      const claudeMdExists = existsSync(claudeMdPath)

      if (!claudeMdExists) {
        prompt += '\n\n## 注意\n\n项目中没有 CLAUDE.md 文件，建议用户是否需要创建一个。\n'
      }

      if (args) {
        prompt += `\n## 用户提供的额外上下文\n\n${args}`
      }

      return prompt
    },
  })
}
