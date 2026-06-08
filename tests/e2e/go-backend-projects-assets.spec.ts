import { expect, test } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readAccount } from './account'

test('supports project, asset, and workflow API shapes with Go backend tokens', async ({ request }) => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const account = readAccount(path.resolve(__dirname, '../../../account.txt'))
  const backendURL = process.env.LUMEN_E2E_BACKEND_URL || 'http://localhost:48081/app-api'

  const login = await request.post(`${backendURL}/member/auth/login`, {
    headers: { 'tenant-id': '1' },
    data: account
  })
  expect(login.ok()).toBeTruthy()
  const loginBody = await login.json()
  expect(loginBody.code).toBe(0)

  const authHeaders = {
    Authorization: `Bearer ${loginBody.data.accessToken}`,
    'tenant-id': '1'
  }

  const projectCreate = await request.post(`${backendURL}/prompt/project/create`, {
    headers: authHeaders,
    data: { name: 'e2e project' }
  })
  expect(projectCreate.ok()).toBeTruthy()
  const projectCreateBody = await projectCreate.json()
  expect(projectCreateBody.code).toBe(0)
  expect(projectCreateBody.data.id).toBeTruthy()

  const canvasData = {
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 }
  }
  const projectUpdate = await request.post(`${backendURL}/prompt/project/update`, {
    headers: authHeaders,
    data: {
      id: projectCreateBody.data.id,
      name: 'e2e project updated',
      thumbnail: '',
      canvasData
    }
  })
  expect(projectUpdate.ok()).toBeTruthy()
  expect((await projectUpdate.json()).code).toBe(0)

  const projectDetail = await request.get(`${backendURL}/prompt/project/detail`, {
    headers: authHeaders,
    params: { id: projectCreateBody.data.id }
  })
  expect(projectDetail.ok()).toBeTruthy()
  const projectDetailBody = await projectDetail.json()
  expect(projectDetailBody.code).toBe(0)
  expect(projectDetailBody.data.canvasData).toMatchObject(canvasData)

  const assetPage = await request.get(`${backendURL}/asset/page`, {
    headers: authHeaders,
    params: { pageNo: 1, pageSize: 10 }
  })
  expect(assetPage.ok()).toBeTruthy()
  const assetPageBody = await assetPage.json()
  expect(assetPageBody.code).toBe(0)
  expect(Array.isArray(assetPageBody.data.list)).toBeTruthy()

  const flowPage = await request.get(`${backendURL}/prompt/flow/page`, {
    headers: authHeaders,
    params: { pageNo: 1, pageSize: 10 }
  })
  expect(flowPage.ok()).toBeTruthy()
  const flowPageBody = await flowPage.json()
  expect(flowPageBody.code).toBe(0)
  expect(Array.isArray(flowPageBody.data.list)).toBeTruthy()

  const publicFlowPage = await request.get(`${backendURL}/prompt/flow/public/page`, {
    headers: authHeaders,
    params: { pageNo: 1, pageSize: 10 }
  })
  expect(publicFlowPage.ok()).toBeTruthy()
  const publicFlowPageBody = await publicFlowPage.json()
  expect(publicFlowPageBody.code).toBe(0)
  expect(Array.isArray(publicFlowPageBody.data.list)).toBeTruthy()

  await request.delete(`${backendURL}/prompt/project/delete`, {
    headers: authHeaders,
    params: { id: projectCreateBody.data.id }
  })
})
