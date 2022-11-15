require('dotenv').config()

import { PlaywrightTestConfig, devices } from '@playwright/test'

const config: PlaywrightTestConfig = {
  testDir: 'tests',
  testMatch: ['roomSessionStreaming.spec.ts'],
  timeout: 60000,
  expect: {
    // Default is 5000
    timeout: 10000,
  },
  // Forbid test.only on CI
  forbidOnly: !!process.env.CI,
  workers: 1,
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          headless: false,
          // devtools: true,
          args: [
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
          ],
        },
      },
    },
  ],
}
export default config
