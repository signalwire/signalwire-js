import type { VideoPositions } from '@signalwire/core'
import {
  BaseConnectionState,
  VideoRoomDeviceEventParams,
  VideoRoomDeviceEventNames,
} from '@signalwire/core'
import type {
  NetworkQuality,
  NetworkIssue,
  RecoveryAttemptInfo,
} from '../monitoring/interfaces'

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
  /** @internal */
  fromCallAddressId?: string

  layout?: string
  positions?: VideoPositions

  /**
   * Number of connections to maintain in the connection pool.
   * Set to 0 to disable connection pooling. Default: 3
   * @internal
   */
  connectionPoolSize?: number

  /**
   * Whether to enable connection pooling for faster call setup.
   * When enabled, maintains pre-warmed RTCPeerConnections with gathered ICE candidates.
   * Default: true
   * @internal
   */
  enableConnectionPool?: boolean

  /**
   * Size of the ICE candidate pool for reuse.
   * Allows ICE candidates to be reused when tracks are replaced.
   * Default: 10
   * @internal
   */
  iceCandidatePoolSize?: number

  /**
   * Enable WebRTC Stats Monitoring feature.
   * When enabled, monitors connection quality, detects issues, and provides recovery actions.
   * Default: true
   * @internal
   */
  enableStatsMonitoring?: boolean
}

export interface EmitDeviceUpdatedEventsParams {
  newTrack: MediaStreamTrack
  prevAudioTrack?: MediaStreamTrack | null
  prevVideoTrack?: MediaStreamTrack | null
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

export type MonitoringEventNames =
  | 'network.quality.changed'
  | 'network.issue.detected'
  | 'network.issue.resolved'
  | 'network.recovery.attempted'

type BaseConnectionEventsHandlerMap = Record<
  BaseConnectionState,
  (params: any) => void
> &
  Record<MediaEventNames, () => void> &
  Record<
    VideoRoomDeviceEventNames,
    (params: VideoRoomDeviceEventParams) => void
  > &
  Record<'network.quality.changed', (params: { quality: NetworkQuality; previousQuality?: NetworkQuality; timestamp: number }) => void> &
  Record<'network.issue.detected', (params: { issue: NetworkIssue; quality: NetworkQuality; timestamp: number }) => void> &
  Record<'network.issue.resolved', (params: { issue: NetworkIssue; duration: number; quality: NetworkQuality; timestamp: number }) => void> &
  Record<'network.recovery.attempted', (params: { attempt: RecoveryAttemptInfo; quality: NetworkQuality; timestamp: number }) => void>

export type BaseConnectionEvents = {
  [k in keyof BaseConnectionEventsHandlerMap]: BaseConnectionEventsHandlerMap[k]
}
