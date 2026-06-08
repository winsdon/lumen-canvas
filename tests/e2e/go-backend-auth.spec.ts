import { expect, test } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readAccount } from './account'

test('loads user info in the frontend with Go backend auth tokens', async ({ page, request }) => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const account = readAccount(path.resolve(__dirname, '../../../account.txt'))
  const backendURL = process.env.LUMEN_E2E_BACKEND_URL || 'http://localhost:48081/app-api'

  const login = await request.post(`${backendURL}/member/auth/login`, {
    headers: {
      'tenant-id': '1'
    },
    data: account
  })
  expect(login.ok()).toBeTruthy()
  const loginBody = await login.json()
  expect(loginBody.code).toBe(0)

  await page.goto('/')
  await page.evaluate(tokens => {
    window.localStorage.setItem('accessToken', tokens.accessToken)
    window.localStorage.setItem('refreshToken', tokens.refreshToken)
    window.localStorage.setItem('expiresTime', new Date(tokens.expiresTime).toISOString())
    window.localStorage.removeItem('userInfo')
  }, loginBody.data)

  const userBody = await page.evaluate(async url => {
    const response = await fetch(`${url}/member/user/get`, {
      headers: {
        Authorization: `Bearer ${window.localStorage.getItem('accessToken') || ''}`,
        'tenant-id': '1'
      }
    })
    return {
      ok: response.ok,
      body: await response.json()
    }
  }, backendURL)
  expect(userBody.ok).toBeTruthy()
  expect(userBody.body.code).toBe(0)
  expect(userBody.body.data).toBeTruthy()

  await expect(page.evaluate(() => window.localStorage.getItem('accessToken'))).resolves.toBeTruthy()
})
