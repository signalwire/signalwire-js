/**
 * Welcome to the technical documentation for the JavaScript SDK.
 *
 * At the outer level, when you import the SignalWire JS library you get access
 * to three different namespaces:
 *
 *  - {@link Video}
 *  - {@link Chat}
 *  - {@link WebRTC}
 *
 * Video gives you access to the classes and methods that let you
 * interface with the backend Video APIs. Chat gives you access to the classes and functions that you need to create a real-time chat application. WebRTC
 * contains several functions that are useful for interacting with the hardware of the user's device.
 *
 *
 * Don't know where to start? Create an instance of
 * {@link Video.RoomSession} to join a room, use the {@link Chat.Client} constructor to start a chat application, or take a look at [Getting Started
 * with the SignalWire Video
 * API](https://developer.signalwire.com/apis/docs/getting-started-with-the-signalwire-video-api-1).
 *
 * @module
 */

import type {
  VideoRoomSessionEventNames,
  RoomStarted,
  RoomSubscribed,
  RoomUpdated,
  RoomEnded,
  VideoMemberEntity,
} from '@signalwire/core'

/** @ignore @deprecated */
export type RoomStartedEventName = RoomStarted
/** @ignore @deprecated */
export type RoomEndedEventName = RoomEnded
/** @ignore @deprecated */
export type RoomSubscribedEventName = RoomSubscribed
/** @ignore @deprecated */
export type RoomUpdatedEventName = RoomUpdated
/** @ignore @deprecated */
export type RoomEvent = VideoRoomSessionEventNames
/** @ignore @deprecated */
export type RoomMember = VideoMemberEntity & { type: 'member' }
/** @ignore @deprecated */
export type RoomScreenShare = VideoMemberEntity & { type: 'screen' }
/** @ignore @deprecated */
export type RoomDevice = VideoMemberEntity & { type: 'device' }

/**
 * The Chat namespace contains the classes and functions that you need to
 * create a real-time chat application.
 */
export * as Chat from './chat'

export * as PubSub from './pubSub'

/**
 * @deprecated The Fabric namespace is deprecated. Please use @signalwire/browser-js instead.
 * 
 * Migration guide:
 * 
 * Before:
 * ```typescript
 * import { Fabric } from '@signalwire/js'
 * const client = await Fabric.SignalWire({ token })
 * ```
 * 
 * After:
 * ```typescript
 * import { SignalWire } from '@signalwire/browser-js'
 * const client = await SignalWire({ token })
 * ```
 */
export const Fabric = (() => {
  console.warn(
    '⚠️  DEPRECATION WARNING: Fabric namespace from @signalwire/js is deprecated.\n' +
    '   Please migrate to @signalwire/browser-js:\n' +
    '   \n' +
    '   Before: import { Fabric } from \'@signalwire/js\'\n' +
    '   After:  import { SignalWire } from \'@signalwire/browser-js\'\n' +
    '   \n' +
    '   See migration guide: https://docs.signalwire.com/js-sdk-migration'
  )
  
  const browserJS = require('@signalwire/browser-js')
  return browserJS
})()

/**
 * @deprecated SignalWire export from @signalwire/js is deprecated. Please use @signalwire/browser-js instead.
 * 
 * Migration guide:
 * 
 * Before:
 * ```typescript
 * import { SignalWire } from '@signalwire/js'
 * const client = await SignalWire({ token })
 * ```
 * 
 * After:
 * ```typescript
 * import { SignalWire } from '@signalwire/browser-js'
 * const client = await SignalWire({ token })
 * ```
 */
export const SignalWire = (() => {
  console.warn(
    '⚠️  DEPRECATION WARNING: SignalWire from @signalwire/js is deprecated.\n' +
    '   Please migrate to @signalwire/browser-js:\n' +
    '   \n' +
    '   Before: import { SignalWire } from \'@signalwire/js\'\n' +
    '   After:  import { SignalWire } from \'@signalwire/browser-js\'\n' +
    '   \n' +
    '   See migration guide: https://docs.signalwire.com/js-sdk-migration'
  )
  
  const browserJS = require('@signalwire/browser-js')
  return browserJS.SignalWire
})()

/**
 * The Video namespace contains the classes and functions that you need to
 * create a video conferencing application.
 */
export * as Video from './video'
export { VideoRoomSession } from './video'
export { RoomSessionScreenShare } from '@signalwire/browser-common'
export { RoomSessionDevice } from '@signalwire/browser-common'

/**
 * The WebRTC namespace includes functions that give you access to the input and
 * output media devices available on the user's machine. For example, you can
 * use these functions to request permission and get access to the media stream
 * from a webcam, from a microphone, or from a screen sharing.
 */
export * as WebRTC from './webrtc'

export type {
  BaseComponentOptions,
  BaseConnectionState,
  ClientEvents,
  EmitterContract,
  RTCTrackEventName,
  UserOptions,
  SessionStatus,
  SessionEvents,
  VideoLayout,
  InternalVideoLayout,
  VideoLayoutEventNames,
  VideoLayoutChangedEventParams,
  VideoRoomSessionEventNames,
  VideoRoomEventParams,
  VideoRoomSubscribedEventParams,
  VideoMemberEntity,
  VideoMemberEventNames,
  MemberTalkingEventNames,
  VideoMemberTalkingEventParams,
  InternalVideoMemberEntity,
  InternalVideoLayoutLayer,
  VideoPosition,
  VideoPositions,
  /**
   * @deprecated Fabric types from @signalwire/js are deprecated. Please use @signalwire/browser-js instead.
   */
  CallUpdatedEventParams,
  CallLeftEventParams,
  CallStateEventParams,
  CallPlayEventParams,
  CallConnectEventParams,
  CallRoomEventParams,
  FabricRoomEventParams,
  FabricLayoutChangedEventParams,
  FabricMemberJoinedEventParams,
  FabricMemberUpdatedEventParams,
  FabricMemberLeftEventParams,
  FabricMemberTalkingEventParams,
  FabricMemberEventParams,
  FabricMemberEntity,
  InternalFabricMemberEntity,
  ConversationMessageEventName,
  ConversationMessageEvent,
  ConversationEventParams,
  ConversationEvent,
} from '@signalwire/core'

export type {
  BaseConnectionOptions,
  ConnectionOptions,
} from '@signalwire/webrtc'

export type {
  RoomSessionObjectEventsHandlerMap,
  RoomSessionObjectEvents,
  // Just to keep backwards compatibility.
  RoomSessionObjectEventsHandlerMap as RoomObjectEventsHandlerMap,
  RoomSessionObjectEvents as RoomObjectEvents,
  RoomEventNames,
  StartScreenShareOptions,
} from './utils/interfaces'

export type {
  CallJoinedEventParams,
} from '@signalwire/browser-js'

/**
 * Build Video Element
 */
export { buildVideoElement } from '@signalwire/browser-common'
export { LocalVideoOverlay, OverlayMap, UserOverlay } from '@signalwire/browser-common'
