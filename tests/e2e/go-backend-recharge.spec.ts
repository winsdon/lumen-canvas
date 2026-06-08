import { expect, test } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readAccount } from './account'

type CommonResult<T = unknown> = {
  code: number
  data?: T
  msg: string
}

function expectCommonResult(body: CommonResult) {
  expect(typeof body.code).toBe('number')
  expect(typeof body.msg).toBe('string')
  expect(body.code).not.toBe(404)
}

test('supports recharge and AI point API shapes with Go backend tokens', async ({ request }) => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const account = readAccount(path.resolve(__dirname, '../../../account.txt'))
  const backendURL = process.env.LUMEN_E2E_BACKEND_URL || 'http://localhost:48081/app-api'

  const login = await request.post(`${backendURL}/member/auth/login`, {
    headers: { 'tenant-id': '1' },
    data: account
  })
  expect(login.ok()).toBeTruthy()
  const loginBody = (await login.json()) as CommonResult<{ accessToken: string }>
  expect(loginBody.code).toBe(0)
  expect(loginBody.data?.accessToken).toBeTruthy()

  const authHeaders = {
    Authorization: `Bearer ${loginBody.data!.accessToken}`,
    'tenant-id': '1'
  }

  const userInfo = await request.get(`${backendURL}/member/user/get`, { headers: authHeaders })
  expect(userInfo.ok()).toBeTruthy()
  const userInfoBody = (await userInfo.json()) as CommonResult<{ point?: number }>
  expectCommonResult(userInfoBody)
  if (userInfoBody.code === 0) {
    expect(typeof userInfoBody.data?.point).toBe('number')
  }

  const rechargePage = await request.get(`${backendURL}/member/point-recharge/page`, {
    headers: authHeaders,
    params: { pageNo: 1, pageSize: 10 }
  })
  expect(rechargePage.ok()).toBeTruthy()
  const rechargePageBody = (await rechargePage.json()) as CommonResult<{ list?: unknown[]; total?: number }>
  expectCommonResult(rechargePageBody)
  if (rechargePageBody.code === 0) {
    expect(Array.isArray(rechargePageBody.data?.list)).toBeTruthy()
    expect(typeof rechargePageBody.data?.total).toBe('number')
  }

  const modelId = Number(process.env.LUMEN_E2E_IMAGE_MODEL_ID || process.env.LUMEN_CONTRACT_IMAGE_MODEL_ID || 1)
  const estimate = await request.get(`${backendURL}/ai/point/estimate`, {
    params: { modelId, duration: 5, resolution: '720P' }
  })
  expect(estimate.ok()).toBeTruthy()
  const estimateBody = (await estimate.json()) as CommonResult<{ point?: number }>
  expectCommonResult(estimateBody)
  if (estimateBody.code === 0) {
    expect(typeof estimateBody.data?.point).toBe('number')
  }

  const rules = await request.get(`${backendURL}/ai/point/rules`, {
    params: { modelId }
  })
  expect(rules.ok()).toBeTruthy()
  const rulesBody = (await rules.json()) as CommonResult<Record<string, unknown[]>>
  expectCommonResult(rulesBody)
  if (rulesBody.code === 0) {
    expect(typeof rulesBody.data).toBe('object')
  }

  if (process.env.LUMEN_E2E_ENABLE_RECHARGE_CREATE !== 'true') {
    return
  }

  const create = await request.post(`${backendURL}/member/point-recharge/create`, {
    headers: authHeaders,
    data: { payPrice: 1000, channelCode: 'alipay_pc' }
  })
  expect(create.ok()).toBeTruthy()
  const createBody = (await create.json()) as CommonResult<{ id: number; payOrderId: number }>
  expectCommonResult(createBody)
  if (createBody.code !== 0) {
    return
  }
  expect(typeof createBody.data?.id).toBe('number')
  expect(typeof createBody.data?.payOrderId).toBe('number')

  const submit = await request.post(`${backendURL}/pay/order/submit`, {
    headers: authHeaders,
    data: {
      id: createBody.data!.payOrderId,
      channelCode: 'alipay_pc',
      returnUrl: 'http://127.0.0.1/recharge'
    }
  })
  expect(submit.ok()).toBeTruthy()
  const submitBody = (await submit.json()) as CommonResult<{ status?: number; displayMode?: string; displayContent?: string }>
  expectCommonResult(submitBody)
  if (submitBody.code === 0) {
    expect(typeof submitBody.data?.status).toBe('number')
  }
})
