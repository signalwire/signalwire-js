import type {
  CallEventNames,
  CallState,
  EventsHandlerMapping,
} from '@signalwire/core'
import type { Call } from '../Call'

export interface CallOptions {
  // TODO: Not used anymore but required for backend
  destinationNumber?: string
  remoteCallerName?: string
  remoteCallerNumber?: string
  callerName?: string
  callerNumber?: string
  // --
  sessionid?: string
  id?: string
  remoteSdp?: string
  localStream?: MediaStream
  remoteStream?: MediaStream
  localElement?: HTMLMediaElement | string | Function
  remoteElement?: HTMLMediaElement | string | Function
  iceServers?: RTCIceServer[]
  audio?: boolean | MediaTrackConstraints
  video?: boolean | MediaTrackConstraints
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
  skipNotifications?: boolean
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

type CallEventsHandlerMapping = EventsHandlerMapping &
  Record<CallState, (params: Call) => void>

export type CallEvents = {
  [k in CallEventNames | CallState]: CallEventsHandlerMapping[k]
}
