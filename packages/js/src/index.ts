/**
 * Welcome to the technical documentation for the JavaScript SDK.
 *
 * At the outer level, when you import the SignalWire JS library you get access
 * to two different namespaces:
 *
 *  - {@link Video}
 *  - {@link WebRTC}
 *
 * {@link Video} gives you access to the classes and methods that let you
 * interface with the backend Video APIs. {@link WebRTC} contains several
 * functions that are useful for interacting with the hardware of the user's
 * device.
 *
 * You don't know where to start? Create an instance of
 * {@link Video.RoomSession} to join a room, or take a look at [Getting Started
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
 * The Video namespace contains the classes and functions that you need to
 * create a video conferencing application.
 */
export * as Video from './video'

/**
 * The WebRTC namespace includes functions that give you access to the input and
 * output media devices available on the user's machine. For example, you can
 * use these functions to request permission and get access to the media stream
 * from a webcam, from a microphone, or from a screen sharing.
 */
export * as WebRTC from './webrtc'

/** @ignore */
export type {
  BaseComponentOptions,
  BaseConnectionState,
  ClientEvents,
  EmitterContract,
  RoomEventNames,
  RTCTrackEventName,
  UserOptions,
  SessionStatus,
  SessionEvents,
  VideoLayout,
  VideoLayoutEventNames,
  VideoRoomSessionEventNames,
  VideoRoomEventParams,
  VideoMemberEntity,
  VideoMemberEventNames,
  MemberTalkingEventNames,
  VideoMemberTalkingEventParams,
  InternalVideoMemberEntity,
} from '@signalwire/core'

/** @ignore */
export type {
  BaseConnectionOptions,
  ConnectionOptions,
} from '@signalwire/webrtc'

/** @ignore */
export type {
  RoomSessionObjectEventsHandlerMap,
  RoomSessionObjectEvents,
  // Just to keep backwards compatibility.
  RoomSessionObjectEventsHandlerMap as RoomObjectEventsHandlerMap,
  RoomSessionObjectEvents as RoomObjectEvents,
} from './utils/interfaces'

// @ts-ignore
if (process.env.NODE_ENV === 'development') {
  console.log('DEV LOG')
}
