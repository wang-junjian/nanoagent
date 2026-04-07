import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { SkillDefinition, SkillFrontmatter, BundledSkillDefinition } from './types.js'

// ============= 内置技能注册表 =============
const bundledSkills: Map<string, BundledSkillDefinition> = new Map()

/**
 * 注册一个内置技能
 */
export function registerBundledSkill(definition: BundledSkillDefinition): void {
  bundledSkills.set(definition.name, definition)
}

/**
 * 获取所有内置技能
 */
export function getBundledSkills(): BundledSkillDefinition[] {
  return Array.from(bundledSkills.values())
}

// ============= YAML frontmatter 解析 =============
function parseFrontmatter(content: string): { frontmatter: SkillFrontmatter; content: string } {
  const frontmatter: SkillFrontmatter = {}
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/
  const match = content.match(frontmatterRegex)

  if (match) {
    const yamlContent = match[1]
    const bodyContent = match[2]

    // 简易 YAML 解析
    const lines = yamlContent.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue

      const colonIndex = trimmed.indexOf(':')
      if (colonIndex > 0) {
        const key = trimmed.slice(0, colonIndex).trim()
        let value = trimmed.slice(colonIndex + 1).trim()

        // 处理数组
        let parsedValue: any = value
        if (value.startsWith('[')) {
          try {
            parsedValue = JSON.parse(value)
          } catch {
            // 如果 JSON 解析失败，尝试简单分割
            parsedValue = value.slice(1, -1).split(',').map((s: string) => s.trim())
          }
        }
        // 处理布尔值
        else if (value === 'true') parsedValue = true
        else if (value === 'false') parsedValue = false

        frontmatter[key as keyof SkillFrontmatter] = parsedValue
      }
    }

    return { frontmatter, content: bodyContent.trim() }
  }

  return { frontmatter, content: content.trim() }
}

// ============= 技能加载 =============

/**
 * 从 .claude/skills/ 目录加载用户自定义技能
 */
function loadUserSkills(cwd: string = process.cwd()): Map<string, SkillDefinition> {
  const skills = new Map<string, SkillDefinition>()
  const skillsDir = join(cwd, '.claude', 'skills')

  if (!existsSync(skillsDir)) {
    return skills
  }

  try {
    const entries = readdirSync(skillsDir, { withFileTypes: true })

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillDir = join(skillsDir, entry.name)
        const skillFile = join(skillDir, 'SKILL.md')

        if (existsSync(skillFile)) {
          try {
            const content = readFileSync(skillFile, 'utf-8')
            const { frontmatter, content: bodyContent } = parseFrontmatter(content)

            const skillName = entry.name
            const description = frontmatter.description || `Skill: ${skillName}`
            const allowedToolsRaw = frontmatter['allowed-tools'] || []
            const allowedTools = Array.isArray(allowedToolsRaw)
              ? allowedToolsRaw
              : typeof allowedToolsRaw === 'string'
                ? allowedToolsRaw.split(',').map(s => s.trim())
                : []
            const userInvocableRaw = frontmatter['user-invocable']
            const userInvocable = userInvocableRaw !== false && userInvocableRaw !== 'false'

            skills.set(skillName, {
              name: skillName,
              description,
              content: bodyContent,
              frontmatter,
              allowedTools,
              whenToUse: frontmatter['when-to-use'],
              model: frontmatter.model,
              userInvocable,
              source: skillDir,
            })
          } catch (e) {
            console.error(`Failed to load skill ${entry.name}:`, e)
          }
        }
      }
    }
  } catch (e) {
    console.error('Failed to load skills:', e)
  }

  return skills
}

/**
 * 加载所有技能（内置 + 用户自定义）
 * 用户自定义技能会覆盖内置技能
 */
export function loadSkills(cwd: string = process.cwd()): Map<string, SkillDefinition> {
  const skills = new Map<string, SkillDefinition>()

  // 先加载内置技能
  for (const bundled of getBundledSkills()) {
    skills.set(bundled.name, {
      name: bundled.name,
      description: bundled.description,
      content: '',
      frontmatter: {},
      allowedTools: bundled.allowedTools || [],
      whenToUse: bundled.whenToUse,
      model: bundled.model,
      userInvocable: bundled.userInvocable !== false,
      source: 'bundled',
      getPrompt: bundled.getPrompt,
    })
  }

  // 再加载用户自定义技能（可能覆盖内置）
  const userSkills = loadUserSkills(cwd)
  for (const [name, skill] of userSkills) {
    skills.set(name, skill)
  }

  return skills
}

// ============= 技能提示获取 =============

/**
 * 获取技能提示内容（替换参数）
 */
export function getSkillPrompt(skill: SkillDefinition, args: string = ''): string {
  // 如果技能有自定义的 getPrompt 函数，使用它
  if (skill.getPrompt) {
    return skill.getPrompt(args)
  }

  // 否则使用内容替换
  let content = skill.content

  // 替换 $ARGUMENTS
  content = content.replace(/\$ARGUMENTS/g, args)

  // 替换 ${ARGUMENTS}
  content = content.replace(/\$\{ARGUMENTS\}/g, args)

  return content
}

// ============= 技能列表 =============

/**
 * 列出所有可用技能
 */
export function listSkills(skills: Map<string, SkillDefinition>): string {
  if (skills.size === 0) {
    return '没有可用的技能。在 .claude/skills/ 目录中创建技能，或使用内置技能。'
  }

  const result: string[] = ['可用技能：']

  // 分组显示：内置和用户自定义
  const bundled: string[] = []
  const user: string[] = []

  for (const [name, skill] of skills) {
    if (!skill.userInvocable) continue

    const lines: string[] = []
    lines.push(`- ${name}: ${skill.description}`)
    if (skill.whenToUse) {
      lines.push(`  使用场景: ${skill.whenToUse}`)
    }
    if (skill.allowedTools && skill.allowedTools.length > 0) {
      lines.push(`  可用工具: ${skill.allowedTools.join(', ')}`)
    }

    if (skill.source === 'bundled') {
      bundled.push(...lines)
    } else {
      user.push(...lines)
    }
  }

  if (bundled.length > 0) {
    result.push('\n【内置技能】')
    result.push(...bundled)
  }

  if (user.length > 0) {
    result.push('\n【用户自定义技能】')
    result.push(...user)
  }

  return result.join('\n')
}
