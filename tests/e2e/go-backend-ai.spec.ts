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
}

function expectNotNotFound(body: CommonResult) {
  expect(body.code).not.toBe(404)
}

test('supports AI API shapes with Go backend tokens', async ({ request }) => {
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

  const modelList = await request.get(`${backendURL}/ai/model/simple-list`, {
    params: { type: 1 }
  })
  expect(modelList.ok()).toBeTruthy()
  const modelListBody = (await modelList.json()) as CommonResult<unknown[]>
  expectCommonResult(modelListBody)
  expectNotNotFound(modelListBody)
  if (modelListBody.code === 0) {
    expect(Array.isArray(modelListBody.data)).toBeTruthy()
  }

  const imagePage = await request.get(`${backendURL}/ai/image/my-page`, {
    headers: authHeaders,
    params: { pageNo: 1, pageSize: 10 }
  })
  expect(imagePage.ok()).toBeTruthy()
  const imagePageBody = (await imagePage.json()) as CommonResult<{ list?: unknown[] }>
  expectCommonResult(imagePageBody)
  expectNotNotFound(imagePageBody)
  if (imagePageBody.code === 0) {
    expect(Array.isArray(imagePageBody.data?.list)).toBeTruthy()
  }

  const imageDraw = await request.post(`${backendURL}/ai/image/draw`, {
    headers: authHeaders,
    data: {
      modelId: Number(process.env.LUMEN_E2E_IMAGE_MODEL_ID || 1),
      prompt: 'playwright image contract',
      width: 512,
      height: 512,
      options: {}
    }
  })
  expect(imageDraw.ok()).toBeTruthy()
  const imageDrawBody = (await imageDraw.json()) as CommonResult<number>
  expectCommonResult(imageDrawBody)
  expectNotNotFound(imageDrawBody)
  if (imageDrawBody.code === 0) {
    expect(typeof imageDrawBody.data).toBe('number')
  }

  const videoPage = await request.get(`${backendURL}/ai/video/my-page`, {
    headers: authHeaders,
    params: { pageNo: 1, pageSize: 10 }
  })
  expect(videoPage.ok()).toBeTruthy()
  const videoPageBody = (await videoPage.json()) as CommonResult<{ list?: unknown[] }>
  expectCommonResult(videoPageBody)
  expectNotNotFound(videoPageBody)
  if (videoPageBody.code === 0) {
    expect(Array.isArray(videoPageBody.data?.list)).toBeTruthy()
  }

  const enhanceGet = await request.get(`${backendURL}/ai/enhance/get-my`, {
    headers: authHeaders,
    params: { id: 1 }
  })
  expect(enhanceGet.ok()).toBeTruthy()
  const enhanceGetBody = (await enhanceGet.json()) as CommonResult
  expectCommonResult(enhanceGetBody)
  expectNotNotFound(enhanceGetBody)

  const generateStream = await request.post(`${backendURL}/ai/generate/stream`, {
    headers: authHeaders,
    data: {
      modelId: Number(process.env.LUMEN_E2E_CHAT_MODEL_ID || 1),
      systemPrompt: 'Return a short response.',
      userPrompt: 'hello',
      images: []
    }
  })
  expect(generateStream.ok()).toBeTruthy()
  const streamText = await generateStream.text()
  expect(streamText).toContain('data:')
  const firstEvent = streamText
    .split('\n')
    .map(line => line.trim())
    .find(line => line.startsWith('data: '))
  expect(firstEvent).toBeTruthy()
  const streamBody = JSON.parse(firstEvent!.slice('data: '.length)) as CommonResult
  expectCommonResult(streamBody)
  expectNotNotFound(streamBody)
})
