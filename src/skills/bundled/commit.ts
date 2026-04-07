import { registerBundledSkill } from '../../skills.js'

const COMMIT_SKILL_PROMPT = `# Git Commit 技能

帮助用户提交代码更改。

## 步骤

1. 首先运行 \`git status\` 查看当前的更改状态
2. 如果没有暂存的更改，询问用户要提交哪些文件
3. 使用 \`git add\` 添加文件到暂存区
4. 询问用户提交信息（如果用户没有提供的话）
5. 执行 \`git commit -m "提交信息"\`
6. 显示提交结果

## 提交信息格式

提交信息应该清晰描述更改内容，使用简洁的语言。

用户提供的参数: $ARGUMENTS
`

export function registerCommitSkill(): void {
  registerBundledSkill({
    name: 'commit',
    description: '执行 git commit 操作，帮助提交代码更改',
    whenToUse: '当用户想要提交代码更改时使用',
    allowedTools: ['Bash', 'FileRead', 'AskUserQuestion'],
    userInvocable: true,
    getPrompt: (args: string) => {
      let prompt = COMMIT_SKILL_PROMPT
      if (args) {
        prompt += `\n## 用户提供的提交信息\n\n请使用以下信息作为提交信息：\`${args}\``
      }
      return prompt
    },
  })
}
