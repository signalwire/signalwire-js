require('dotenv').config()

import { PlaywrightTestConfig, devices } from '@playwright/test'

const callfabricTests = [
  'callfabric/address.spec.ts',
  'callfabric/agent_customer.spec.ts',
  'callfabric/audioFlags.spec.ts',
  'callfabric/cleanup.spec.ts',
  'callfabric/conversation.spec.ts',
  'callfabric/deviceEvent.spec.ts',
  'callfabric/deviceState.spec.ts',
  'callfabric/holdunhold.spec.ts',
  'callfabric/incomingCall.spec.ts',
  'callfabric/mirrorVideo.spec.ts',
  'callfabric/muteUnmuteAll.spec.ts',
  'callfabric/raiseHand.spec.ts',
  'callfabric/reattach.spec.ts',
  // 'callfabric/relayApp.spec.ts', // Disabled: depends on removed @signalwire/realtime-api
  'callfabric/swml.spec.ts',
  'callfabric/videoRoom.spec.ts',
  'callfabric/videoRoomLayout.spec.ts',
]
const renegotiationTests = [
  'callfabric/renegotiateAudio.spec.ts',
  'callfabric/renegotiateVideo.spec.ts',
]
const videoElementTests = ['buildVideoWithFabricSDK.spec.ts']

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
  reporter: process.env.CI
    ? [['github'], [require.resolve('./test-reporter.ts')]]
    : [['list'], [require.resolve('./test-reporter.ts')]],
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
