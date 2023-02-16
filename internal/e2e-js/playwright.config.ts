require('dotenv').config()

import { PlaywrightTestConfig, devices } from '@playwright/test'

const streamingTests = [
  'roomSessionStreamingAPI.spec.ts',
  'roomSessionStreaming.spec.ts',
]
const slowTests = [
  'roomSessionAudienceCount.spec.ts',
  'roomSessionBadNetwork.spec.ts',
]

const useDesktopChrome = {
  ...devices['Desktop Chrome'],
  launchOptions: {
    // devtools: true,
    // headless: false,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
    ],
  },
}

const config: PlaywrightTestConfig = {
  testDir: 'tests',
  globalSetup: require.resolve('./global-setup'),
  testMatch: undefined,
  testIgnore: undefined,
  timeout: 120_000,
  expect: {
    // Default is 5000
    timeout: 10_000,
  },
  // Forbid test.only on CI
  forbidOnly: !!process.env.CI,
  workers: 1,
  projects: [
    {
      name: 'default',
      use: useDesktopChrome,
      testIgnore: [...slowTests, ...streamingTests],
    },
    {
      name: 'streaming',
      use: useDesktopChrome,
      testMatch: streamingTests,
    },
    {
      name: 'slow',
      use: useDesktopChrome,
      testMatch: slowTests,
    },
  ],
}
export default config
