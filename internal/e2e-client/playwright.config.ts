require('dotenv').config()

import { PlaywrightTestConfig, devices } from '@playwright/test'

const callfabricCoreRoomTests = [
  'callfabric/videoRoom.spec.ts',
  'callfabric/videoRoomLayout.spec.ts',
]
const callfabricAudioVideoTests = [
  'callfabric/audioFlags.spec.ts',
  'callfabric/mirrorVideo.spec.ts',
  'callfabric/muteUnmuteAll.spec.ts',
]
const callfabricDeviceTests = [
  'callfabric/deviceEvent.spec.ts',
  'callfabric/deviceState.spec.ts',
]
const callfabricAgentTests = [
  'callfabric/agent_customer.spec.ts',
  'callfabric/address.spec.ts',
  'callfabric/relayApp.spec.ts',
  'callfabric/swml.spec.ts',
]
const callfabricConnectionTests = [
  'callfabric/reattach.spec.ts',
  'callfabric/cleanup.spec.ts',
]
const callfabricInteractionTests = [
  'callfabric/raiseHand.spec.ts',
  'callfabric/holdunhold.spec.ts',
]
const callfabricRenegotiationTests = [
  'callfabric/renegotiateAudio.spec.ts',
  'callfabric/renegotiateVideo.spec.ts',
]
const callfabricConversationTests = ['callfabric/conversation.spec.ts']
const callfabricIncomingCallTests = ['callfabric/incomingCall.spec.ts']
const callFabricWebsocketTests = [
  'callfabric/incoming_call_over_websocket.spec.ts',
  'callfabric/websocket_reconnect.spec.ts',
]
const callfabricUtilsTests = ['callfabric/utils.spec.ts']

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
        ...callfabricAgentTests,
        ...callfabricCoreRoomTests,
        ...callfabricAudioVideoTests,
        ...callfabricDeviceTests,
        ...callfabricConnectionTests,
        ...callfabricInteractionTests,
        ...callfabricConversationTests,
        ...callfabricIncomingCallTests,
        ...callFabricWebsocketTests,
        ...callfabricUtilsTests,
        ...callfabricRenegotiationTests,
        ...videoElementTests,
      ],
    },
    {
      name: 'callfabricUtilities',
      use: useDesktopChrome,
      testMatch: callfabricUtilsTests,
    },
    {
      name: 'callfabricCoreRoom',
      use: useDesktopChrome,
      testMatch: callfabricCoreRoomTests,
    },
    {
      name: 'callfabricAudioVideo',
      use: useDesktopChrome,
      testMatch: callfabricAudioVideoTests,
    },
    {
      name: 'callfabricDevice',
      use: useDesktopChrome,
      testMatch: callfabricDeviceTests,
    },
    {
      name: 'callfabricAgent',
      use: useDesktopChrome,
      testMatch: callfabricAgentTests,
    },
    {
      name: 'callfabricConnection',
      use: useDesktopChrome,
      testMatch: callfabricConnectionTests,
    },
    {
      name: 'callfabricInteraction',
      use: useDesktopChrome,
      testMatch: callfabricInteractionTests,
    },
    {
      name: 'callfabricRenegotiation',
      use: useDesktopChrome,
      testMatch: callfabricRenegotiationTests,
    },
    {
      name: 'callfabricConversation',
      use: useDesktopChrome,
      testMatch: callfabricConversationTests,
    },
    {
      name: 'callfabricIncomingCall',
      use: useDesktopChrome,
      testMatch: callfabricIncomingCallTests,
    },
    {
      name: 'callFabricWebsocket',
      use: useDesktopChrome,
      testMatch: callFabricWebsocketTests,
    },
    {
      name: 'callfabricRenegotiation',
      use: useDesktopChrome,
      testMatch: callfabricRenegotiationTests,
    },
    {
      name: 'videoElement',
      use: useDesktopChrome,
      testMatch: videoElementTests,
    },
  ],
}
export default config
