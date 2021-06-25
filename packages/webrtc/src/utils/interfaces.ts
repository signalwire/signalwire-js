import StrictEventEmitter from 'strict-event-emitter-types'
import type {
  RoomEventNames,
  BaseConnectionState,
  EventsHandlerMapping,
} from '@signalwire/core'
import type { Room } from '../Room'

export interface ConnectionOptions {
  // TODO: Not used anymore but required for backend
  destinationNumber?: string
  remoteCallerName?: string
  remoteCallerNumber?: string
  callerName?: string
  callerNumber?: string
  // --
  sessionid?: string
  remoteSdp?: string
  localStream?: MediaStream
  remoteStream?: MediaStream
  localElement?: HTMLMediaElement | string | Function
  remoteElement?: HTMLMediaElement | string | Function
  iceServers?: RTCIceServer[]
  audio?: MediaStreamConstraints['audio']
  video?: MediaStreamConstraints['video']
  attach?: boolean
  useStereo?: boolean
  micId?: string
  micLabel?: string
  camId?: string
  camLabel?: string
  speakerId?: string
  userVariables?: { [key: string]: any }
  screenShare?: boolean
  secondSource?: boolean
  recoverCall?: boolean
  skipLiveArray?: boolean
  onNotification?: Function
  googleMaxBitrate?: number
  googleMinBitrate?: number
  googleStartBitrate?: number
  negotiateAudio?: boolean
  negotiateVideo?: boolean
  sfu?: boolean
  simulcast?: boolean
  msStreamsNumber?: number
  requestTimeout?: number
  shakenCheck?: string
  shakenResult?: string
  autoApplyMediaParams?: boolean
  rtcPeerConfig?: { [key: string]: any }
  iceGatheringTimeout?: number
}

type BaseConnectionEventsHandlerMapping = EventsHandlerMapping &
  Record<BaseConnectionState, (params: Room) => void>

export type RoomObjectEvents = {
  [k in
    | RoomEventNames
    | BaseConnectionState]: BaseConnectionEventsHandlerMapping[k]
}

export type RoomObject = StrictEventEmitter<Room, RoomObjectEvents>

export type CreateScreenShareObjectOptions = {
  autoJoin?: boolean
  audio?: MediaStreamConstraints['audio']
  video?: MediaStreamConstraints['video']
}
