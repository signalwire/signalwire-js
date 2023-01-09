require('dotenv').config()

import { PlaywrightTestConfig, devices } from '@playwright/test'

const config: PlaywrightTestConfig = {
  testDir: 'tests',
  globalSetup: require.resolve('./global-setup'),
  testMatch: ['roomSessionTalkingEventsToAudience.spec.ts'],
  testIgnore: [
    'roomSessionPromoteParticipant.spec.ts',
    //   'roomSessionStreaming.spec.ts',
  ],
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
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
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
