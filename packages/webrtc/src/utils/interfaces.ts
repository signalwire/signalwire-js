import type { VideoPositions } from '@signalwire/core'

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
  sessionid?: string
  /** @internal */
  remoteSdp?: string
  /** @internal */
  localStream?: MediaStream
  /** @internal */
  remoteStream?: MediaStream
  /** List of ICE servers. */
  iceServers?: RTCIceServer[]
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
  pingSupported?: boolean

  layout?: string
  positions?: VideoPositions
}
