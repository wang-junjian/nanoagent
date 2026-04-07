import { registerBundledSkill } from '../../skills.js'

const SIMPLIFY_SKILL_PROMPT = `# Simplify: 代码审查和清理

审查更改的代码，检查复用性、质量和效率，并修复发现的问题。

## 阶段 1: 识别更改

运行 \`git diff\` 查看更改内容。如果没有 git 更改，查看用户提到的或之前编辑过的最近修改的文件。

## 阶段 2: 代码审查

审查相同的更改，检查以下方面：

### 代码复用审查
1. 搜索现有的工具和助手函数，它们可以替换新编写的代码
2. 标记任何重复现有功能的新函数，建议使用现有函数
3. 标记可以使用现有工具的内联逻辑

### 代码质量审查
审查相同的更改，检查是否有 hacky 模式：
1. 冗余状态：重复现有状态的状态
2. 参数泛滥：向函数添加新参数而不是泛化或重组现有参数
3. 复制粘贴略有变化：应该用共享抽象统一的近乎重复的代码块
4. 不必要的注释：解释代码做什么的注释（命名良好的标识符已经做到了）

### 效率审查
审查相同的更改，检查效率：
1. 不必要的工作：冗余计算、重复的文件读取、重复的网络/API 调用
2. 错过的并发：独立操作顺序运行而不是并行运行
3. 不必要的存在检查：在操作前预先检查文件/资源存在（TOCTOU 反模式）- 直接操作并处理错误

## 阶段 3: 修复问题

修复每个发现的问题。如果某个发现是误报或不值得处理，记下并继续 - 不要争论这个发现，直接跳过它。

完成后，简要总结修复了什么（或确认代码已经很干净）。

用户提供的额外说明: $ARGUMENTS
`

export function registerSimplifySkill(): void {
  registerBundledSkill({
    name: 'simplify',
    description: '审查更改的代码，检查复用性、质量和效率，然后修复发现的问题',
    whenToUse: '当用户想要审查和清理代码更改时使用',
    allowedTools: ['Bash', 'FileRead', 'FileEdit', 'Glob', 'Grep'],
    userInvocable: true,
    getPrompt: (args: string) => {
      let prompt = SIMPLIFY_SKILL_PROMPT
      if (args) {
        prompt += `\n## 额外关注点\n\n${args}`
      }
      return prompt
    },
  })
}
