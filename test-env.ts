#!/usr/bin/env tsx
/**
 * 测试 .env 文件是否被正确加载
 */

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// 加载 .env 文件（模拟 main.ts 中的逻辑）
function loadEnv() {
  const envPath = resolve(process.cwd(), '.env')
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIndex = trimmed.indexOf('=')
        if (eqIndex > 0) {
          const key = trimmed.slice(0, eqIndex).trim()
          let value = trimmed.slice(eqIndex + 1).trim()
          if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1)
          }
          process.env[key] = value
        }
      }
    }
  }
}

async function test() {
  console.log('📋 测试 .env 文件加载...\n')

  // 加载环境变量
  loadEnv()

  // 然后导入配置
  const { CONFIG } = await import('./src/config.js')

  console.log('✅ 环境变量加载结果:\n')
  console.log(`  BASE_URL: ${CONFIG.baseURL}`)
  console.log(`  API_KEY: ${CONFIG.apiKey.substring(0, 10)}...（已隐藏）`)
  console.log(`  MODEL: ${CONFIG.model}`)
  console.log(`  MAX_TOKENS: ${CONFIG.maxTokens}`)

  // 验证配置是否有效
  const isValid = CONFIG.baseURL && CONFIG.apiKey && CONFIG.model
  if (isValid) {
    console.log('\n✅ 配置验证通过！.env 文件已正确加载。')
  } else {
    console.log('\n❌ 配置验证失败！可能有配置项未加载。')
  }
}

test().catch(console.error)
