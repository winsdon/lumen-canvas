import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env.LUMEN_CANVAS_E2E_PORT || 5174)
const backendURL = process.env.LUMEN_E2E_BACKEND_URL || 'http://localhost:48081/app-api'
const externalAPIURL = process.env.LUMEN_E2E_EXTERNAL_API_URL || 'https://api.chatfire.site/v1'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: {
    timeout: 10_000
  },
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'off',
    screenshot: 'off',
    video: 'off'
  },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_APP_API_BASE_URL: backendURL,
      VITE_EXTERNAL_API_BASE_URL: externalAPIURL
    },
    timeout: 120_000
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
})
