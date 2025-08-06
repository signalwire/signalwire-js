import type { VideoPositions } from '@signalwire/core'
import {
  BaseConnectionState,
  VideoRoomDeviceEventParams,
  VideoRoomDeviceEventNames,
} from '@signalwire/core'
import { WebRTCMonitoringConfig, NetworkIssue } from './webrtcStatsMonitor'
import { DevicePreferenceConfig } from './devicePreferenceManager'

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
  fromFabricAddressId?: string

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
   * WebRTC monitoring configuration for real-time network quality assessment
   * and issue detection. When enabled, provides network statistics and
   * automated issue reporting.
   */
  monitoring?: Partial<WebRTCMonitoringConfig> & { enabled?: boolean }

  /**
   * Device preference management configuration for smart device recovery
   * and persistent device preferences. Provides automatic device switching
   * when preferred devices become unavailable.
   */
  devicePreferences?: Partial<DevicePreferenceConfig>
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
  | 'network.issue.detected'
  | 'network.quality.changed'
  | 'device.recovered'

type BaseConnectionEventsHandlerMap = Record<
  BaseConnectionState,
  (params: any) => void
> &
  Record<MediaEventNames, () => void> &
  Record<
    VideoRoomDeviceEventNames,  
    (params: VideoRoomDeviceEventParams) => void
  > &
  Record<'network.issue.detected', (issue: NetworkIssue) => void> &
  Record<'network.quality.changed', (isHealthy: boolean, previousState: boolean) => void> &
  Record<'device.recovered', (params: { deviceType: string; deviceId: string; deviceLabel?: string }) => void>

export type BaseConnectionEvents = {
  [k in keyof BaseConnectionEventsHandlerMap]: BaseConnectionEventsHandlerMap[k]
}
