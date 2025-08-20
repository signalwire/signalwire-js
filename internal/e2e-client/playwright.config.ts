require('dotenv').config()

import { PlaywrightTestConfig, devices } from '@playwright/test'

const callfabricTests = [
  'address.spec.ts',
  'agent_customer.spec.ts',
  'audioFlags.spec.ts',
  'cleanup.spec.ts',
  'conversation.spec.ts',
  'deviceEvent.spec.ts',
  'deviceState.spec.ts',
  'holdunhold.spec.ts',
  'incomingCall.spec.ts',
  'mirrorVideo.spec.ts',
  'muteUnmuteAll.spec.ts',
  'raiseHand.spec.ts',
  'reattach.spec.ts',
  'relayApp.spec.ts',
  'swml.spec.ts',
  'videoRoom.spec.ts',
  'videoRoomLayout.spec.ts',
]
const renegotiationTests = [
  'renegotiateAudio.spec.ts',
  'renegotiateVideo.spec.ts',
]
const videoElementTests = ['buildVideoWithCallSDK.spec.ts']

const useDesktopChrome: PlaywrightTestConfig['use'] = {
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
  reporter: process.env.CI ? [['github'], ['line']] : [['list'], ['line']],
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
  snapshotPathTemplate: '{testDir}/{testFilePath}-snapshots/{arg}{ext}',
  projects: [
    {
      name: 'default',
      use: useDesktopChrome,
      testIgnore: [
        ...callfabricTests,
        ...renegotiationTests,
        ...videoElementTests,
      ],
    },
    {
      name: 'callfabric',
      use: useDesktopChrome,
      testMatch: callfabricTests,
    },
    {
      name: 'renegotiation',
      use: useDesktopChrome,
      testMatch: renegotiationTests,
    },
    {
      name: 'videoElement',
      use: useDesktopChrome,
      testMatch: videoElementTests,
    },
  ],
}
export default config
