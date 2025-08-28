require('dotenv').config()

import { PlaywrightTestConfig, devices } from '@playwright/test'

const chatPubSubTests = ['chat.spec.ts', 'pubSub.spec.ts']
const streamingTests = [
  'roomSessionStreamingAPI.spec.ts',
  'roomSessionStreaming.spec.ts',
  'roomSessionMultipleStreams.spec.ts',
  'roomSessionAutomaticStream.spec.ts',
]
const badNetworkTests = ['roomSessionBadNetwork.spec.ts']
const promoteTests = [
  'roomSessionPromoteDemote.spec.ts',
  'roomSessionPromoteMeta.spec.ts',
  'roomSessionPromoteParticipant.spec.ts',
  'roomSessionPromoteReattachDemote.spec.ts',
]
const demoteTests = [
  'roomSessionDemote.spec.ts',
  'roomSessionDemoteAudience.spec.ts',
  'roomSessionDemoteReattachPromote.spec.ts',
  'roomSessionDemotePromote.spec.ts',
]
const audienceTests = [
  'roomSessionAudienceCount.spec.ts',
  'roomSessionFollowLeader.spec.ts',
  'roomSessionTalkingEventsToAudience.spec.ts',
  'roomSessionUnauthorized.spec.ts',
]
const joinFlowTests = [
  'roomSessionJoinFrom.spec.ts',
  'roomSessionJoinUntil.spec.ts',
]
const talkingTests = [
  'roomSessionTalkingEventsParticipant.spec.ts',
  'roomSessionTalkingEventsToAudience.spec.ts',
]
const removeMemberTests = [
  'roomSessionRemoveAfterSecondsElapsed.spec.ts',
  'roomSessionRemoveAllMembers.spec.ts',
  'roomSessionRemoveAt.spec.ts',
]
const deviceTests = [
  'roomSessionDevices.spec.ts',
  'roomSessionLocalStream.spec.ts',
]
const interactionTests = [
  'roomSessionLockUnlock.spec.ts',
  'roomSessionRaiseHand.spec.ts',
  'roomSessionMethodsOnNonExistingMembers.spec.ts',
]
const reattachTests = [
  'roomSessionReattach.spec.ts',
  'roomSessionReattachBadAuth.spec.ts',
  'roomSessionReattachMultiple.spec.ts',
  'roomSessionReattachScreenshare.spec.ts',
  'roomSessionReattachWrongCallId.spec.ts',
  'roomSessionReattachWrongProtocol.spec.ts',
]
const callfabricTests = [
  'address.spec.ts',
  'agentCustomer.spec.ts',
  'audioFlags.spec.ts',
  'cleanup.spec.ts',
  'deviceEvent.spec.ts',
  'deviceState.spec.ts',
  'holdunhold.spec.ts',
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
  'roomSessionUpdateMedia.spec.ts',
  'renegotiateAudio.spec.ts',
  'renegotiateVideo.spec.ts',
]
const videoElementTests = [
  'buildVideoWithVideoSDK.spec.ts',
  'buildVideoWithFabricSDK.spec.ts',
]
const v2WebRTCTests = ['v2WebrtcFromRest.spec.ts', 'webrtcCalling.spec.ts']

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
  reporter: process.env.CI ? [['github'], ['line']] : [['list']],
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
        ...chatPubSubTests,
        ...badNetworkTests,
        ...streamingTests,
        ...promoteTests,
        ...demoteTests,
        ...audienceTests,
        ...talkingTests,
        ...removeMemberTests,
        ...joinFlowTests,
        ...deviceTests,
        ...interactionTests,
        ...reattachTests,
        ...callfabricTests,
        ...renegotiationTests,
        ...videoElementTests,
        ...v2WebRTCTests,
      ],
    },
    {
      name: 'chatPubSub',
      use: useDesktopChrome,
      testMatch: chatPubSubTests,
    },
    {
      name: 'streaming',
      use: useDesktopChrome,
      testMatch: streamingTests,
    },
    {
      name: 'badNetwork',
      use: useDesktopChrome,
      testMatch: badNetworkTests,
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
      name: 'audience',
      use: useDesktopChrome,
      testMatch: audienceTests,
    },
    {
      name: 'talking',
      use: useDesktopChrome,
      testMatch: talkingTests,
    },
    {
      name: 'removeMember',
      use: useDesktopChrome,
      testMatch: removeMemberTests,
    },
    {
      name: 'joinFlow',
      use: useDesktopChrome,
      testMatch: joinFlowTests,
    },
    {
      name: 'devices',
      use: useDesktopChrome,
      testMatch: deviceTests,
    },
    {
      name: 'interactions',
      use: useDesktopChrome,
      testMatch: interactionTests,
    },
    {
      name: 'reattach',
      use: useDesktopChrome,
      testMatch: reattachTests,
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
    {
      name: 'v2WebRTC',
      use: useDesktopChrome,
      testMatch: v2WebRTCTests,
    },
  ],
}
export default config
