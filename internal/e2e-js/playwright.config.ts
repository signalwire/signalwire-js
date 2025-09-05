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
const renegotiationTests = ['roomSessionUpdateMedia.spec.ts']
const reattachTests = [
  'roomSessionReattach.spec.ts',
  'roomSessionReattachBadAuth.spec.ts',
  'roomSessionReattachMultiple.spec.ts',
  'roomSessionReattachScreenshare.spec.ts',
  'roomSessionReattachWrongCallId.spec.ts',
  'roomSessionReattachWrongProtocol.spec.ts',
]
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
  'callfabric/agentCustomer.spec.ts',
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
        ...callfabricCoreRoomTests,
        ...callfabricAudioVideoTests,
        ...callfabricDeviceTests,
        ...callfabricAgentTests,
        ...callfabricConnectionTests,
        ...callfabricInteractionTests,
        ...callfabricRenegotiationTests,
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
      name: 'renegotiation',
      use: useDesktopChrome,
      testMatch: renegotiationTests,
    },
    {
      name: 'reattach',
      use: useDesktopChrome,
      testMatch: reattachTests,
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
