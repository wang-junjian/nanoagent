/**
 * 内置技能模块
 * 导出所有内置技能的注册函数
 */

import { registerCommitSkill } from './commit.js'
import { registerSimplifySkill } from './simplify.js'
import { registerRememberSkill } from './remember.js'

/**
 * 初始化所有内置技能
 * 在应用启动时调用此函数来注册所有内置技能
 */
export function initBundledSkills(): void {
  registerCommitSkill()
  registerSimplifySkill()
  registerRememberSkill()
}

// 导出单个注册函数，方便按需注册
export {
  registerCommitSkill,
  registerSimplifySkill,
  registerRememberSkill,
}
