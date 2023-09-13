import { defineConfig, devices } from '@playwright/test'

require('dotenv').config()

const useDesktopChrome = {
  ...devices['Desktop Chrome'],
  launchOptions: {
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
    ],
  },
}

const config = defineConfig({
  testDir: './src/playwright',
  globalSetup: require.resolve('./global-setup'),
  testMatch: undefined,
  testIgnore: undefined,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  workers: 1,
  projects: [
    {
      name: 'default',
      use: useDesktopChrome,
    },
  ],
})

export default config
