/**
 * 技能工具 - 加载和执行技能
 * 技能渐进式展开：返回 newMessages，将技能内容直接加入对话
 */

import { Tool } from '../tool-system.js'
import { ToolExecutionError } from '../errors.js'
import type { ToolResult, Message } from '../types.js'
import { loadSkills, getSkillPrompt, listSkills } from '../skills.js'

export class SkillTool extends Tool {
  name = 'Skill'
  description = '执行一个技能（skill），技能是预定义的任务模板'

  params = {
    skill: { type: 'string' as const, description: '技能名称', required: true },
    args: { type: 'string' as const, description: '传递给技能的参数（可选）', required: false },
  }

  async execute(args: Record<string, any>): Promise<string | ToolResult> {
    const { skill: skillName, args: skillArgs = '' } = args

    try {
      const skills = loadSkills()
      const skill = skills.get(skillName)

      if (!skill) {
        return `错误: 未找到技能 "${skillName}"\n\n${listSkills(skills)}`
      }

      const prompt = getSkillPrompt(skill, skillArgs)

      // 技能渐进式展开：返回 newMessages，将技能内容作为 user message
      const newMessages: Message[] = [
        {
          role: 'user',
          content: prompt,
        },
      ]

      return {
        content: `[技能: ${skillName}] 已展开`,
        newMessages,
      }
    } catch (error) {
      throw new ToolExecutionError(
        `执行技能失败: ${error instanceof Error ? error.message : String(error)}`,
        this.name,
      )
    }
  }
}

export class ListSkillsTool extends Tool {
  name = 'ListSkills'
  description = '列出所有可用的技能'

  params = {}

  async execute(): Promise<string> {
    try {
      const skills = loadSkills()
      return listSkills(skills)
    } catch (error) {
      throw new ToolExecutionError(
        `列出技能失败: ${error instanceof Error ? error.message : String(error)}`,
        this.name,
      )
    }
  }
}
