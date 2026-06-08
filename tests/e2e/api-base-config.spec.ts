import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../..')

function readRepoFile(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')
}

test('keeps app-api and external v1 base URLs independently configurable', () => {
  const constants = readRepoFile('src/utils/constants.js')
  const playwrightConfig = readRepoFile('playwright.config.ts')
  const envDevelopment = readRepoFile('.env.development')
  const envProduction = readRepoFile('.env.production')
  const fileApi = readRepoFile('src/api/file.js')

  expect(constants).toContain('VITE_APP_API_BASE_URL')
  expect(constants).toContain('VITE_EXTERNAL_API_BASE_URL')
  expect(constants).toMatch(/DEFAULT_API_BASE_URL[\s\S]*VITE_EXTERNAL_API_BASE_URL/)
  expect(constants).toMatch(/AUTH_BASE_URL[\s\S]*VITE_APP_API_BASE_URL/)

  expect(playwrightConfig).toContain('VITE_APP_API_BASE_URL')
  expect(playwrightConfig).toContain('VITE_EXTERNAL_API_BASE_URL')
  expect(envDevelopment).toContain('VITE_APP_API_BASE_URL=')
  expect(envDevelopment).toContain('VITE_EXTERNAL_API_BASE_URL=')
  expect(envProduction).toContain('VITE_APP_API_BASE_URL=')
  expect(envProduction).toContain('VITE_EXTERNAL_API_BASE_URL=')

  expect(fileApi).toContain("import { authRequest } from '@/utils/request'")
  expect(fileApi).toContain('return authRequest({')
  expect(fileApi).not.toContain("import request from '@/utils/request'")
})
