import type {
  EventEmitter,
  MediaDeviceIdentifiers,
  VideoPositions,
} from '@signalwire/core'
import {
  BaseConnectionState,
  VideoRoomDeviceEventParams,
  VideoRoomDeviceEventNames,
} from '@signalwire/core'

export interface ConnectionOptions {
  // TODO: Not used anymore but required for backend
  /** @internal */
  destinationNumber?: string
  /** @internal */
  remoteCallerName?: string
  /** @internal */
  remoteCallerNumber?: string
  /** @internal */
  callerName?: string
  /** @internal */
  callerNumber?: string
  // --
  /** @internal */
  remoteSdp?: string
  /** @internal */
  localStream?: MediaStream
  /** @internal */
  remoteStream?: MediaStream
  /** List of ICE servers. */
  iceServers?: RTCIceServer[]
  /** Disable ICE UDP transport policy */
  disableUdpIceServers?: boolean
  /** Audio constraints to use when joining the room. Default: `true`. */
  audio?: MediaStreamConstraints['audio']
  /** Video constraints to use when joining the room. Default: `true`. */
  video?: MediaStreamConstraints['video']
  /** @internal */
  attach?: boolean
  /** @internal */
  useStereo?: boolean
  /** @internal */
  micId?: string
  /** @internal */
  micLabel?: string
  /** @internal */
  camId?: string
  /** @internal */
  camLabel?: string
  /** Id of the speaker device to use for audio output. If undefined, picks a default speaker. */
  speakerId?: string
  /** @internal */
  userVariables?: { [key: string]: any }
  /** @internal */
  screenShare?: boolean
  /** @internal */
  additionalDevice?: boolean
  /** @internal */
  recoverCall?: boolean
  /** @internal */
  googleMaxBitrate?: number
  /** @internal */
  googleMinBitrate?: number
  /** @internal */
  googleStartBitrate?: number
  /** @internal */
  negotiateAudio?: boolean
  /** @internal */
  negotiateVideo?: boolean
  /** @internal */
  sfu?: boolean
  /** @internal */
  simulcast?: boolean
  /** @internal */
  msStreamsNumber?: number
  /** @internal */
  requestTimeout?: number
  /** @internal */
  shakenCheck?: string
  /** @internal */
  shakenResult?: string
  /** @internal */
  autoApplyMediaParams?: boolean
  /** @internal */
  rtcPeerConfig?: { [key: string]: any }
  /** @internal */
  iceGatheringTimeout?: number
  /** @internal */
  maxIceGatheringTimeout?: number
  /** @internal */
  maxConnectionStateTimeout?: number
  /** @internal */
  watchMediaPackets?: boolean
  /** @internal */
  watchMediaPacketsTimeout?: number

  /** @internal */
  pingSupported?: boolean
  /** @internal */
  prevCallId?: string
  /** @internal */
  nodeId?: string

  layout?: string
  positions?: VideoPositions
}

export interface EmitDeviceUpdatedEventsParams {
  newTrack: MediaStreamTrack
  prevAudioTrack?: MediaStreamTrack | null
  prevVideoTrack?: MediaStreamTrack | null
}
export interface EmitDeviceConstraintsUpdatedEventsParams {
  currentConstraints: MediaTrackConstraints
  prevTrackIdentifiers: MediaDeviceIdentifiers | undefined
  currentTrackIdentifiers: MediaDeviceIdentifiers
}

export interface EmitDeviceUpdatedEventHelperParams
  extends EmitDeviceUpdatedEventsParams {
  emitFn: <E extends EventEmitter.EventNames<BaseConnectionEvents>>(
    event: E,
    ...args: EventEmitter.EventArgs<BaseConnectionEvents, E>
  ) => boolean
}

export type UpdateMediaOptionsParams = Pick<
  ConnectionOptions,
  'video' | 'audio' | 'negotiateVideo' | 'negotiateAudio'
>

export interface OnVertoByeParams {
  byeCause: string
  byeCauseCode: string
  rtcPeerId: string
  redirectDestination?: string
}

export type MediaEventNames =
  | 'media.connected'
  | 'media.reconnecting'
  | 'media.disconnected'

type BaseConnectionEventsHandlerMap = Record<
  BaseConnectionState,
  (params: any) => void
> &
  Record<MediaEventNames, () => void> &
  Record<
    VideoRoomDeviceEventNames,
    (params: VideoRoomDeviceEventParams) => void
  >

export type BaseConnectionEvents = {
  [k in keyof BaseConnectionEventsHandlerMap]: BaseConnectionEventsHandlerMap[k]
}
