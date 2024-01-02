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
const promoteTests = [
  'roomSessionPromoteDemote.spec.ts',
  'roomSessionPromoteMeta.spec.ts',
  'roomSessionPromoteParticipant.spec.ts',
  'roomSessionPromoteReattachDemote.spec.ts',
]
const demoteTests = [
  'roomSessionDemote.spec.ts',
  'roomSessionDemoteAudience.spec.ts',
  'roomSessionDemoteReattachPromote.spec',
]
const reattachTests = [
  'roomSessionReattach.spec.ts',
  'roomSessionReattachBadAuth.spec.ts',
  'roomSessionReattachMultiple.spec.ts',
  'roomSessionReattachScreenshare.spec.ts',
  'roomSessionReattachWrongCallId.spec.ts',
]
const v2WebRTC = ['v2WebrtcFromRest.spec.ts', 'webrtcCalling.spec.ts']

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
  reporter: process.env.CI ? 'github' : 'list',
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
      testIgnore: [
        ...slowTests,
        ...streamingTests,
        ...promoteTests,
        ...demoteTests,
        ...reattachTests,
        ...v2WebRTC,
      ],
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
    {
      name: 'promote',
      use: useDesktopChrome,
      testMatch: promoteTests,
    },
    {
      name: 'demote',
      use: useDesktopChrome,
      testMatch: demoteTests,
    },
    {
      name: 'reattach',
      use: useDesktopChrome,
      testMatch: reattachTests,
    },
    {
      name: 'v2WebRTC',
      use: useDesktopChrome,
      testMatch: v2WebRTC,
    },
  ],
}
export default config
