import type { EventEmitter } from '../utils/EventEmitter'
import type { VideoAPIEventParams, InternalVideoEventNames } from './video'
import type { SessionEvents, JSONRPCRequest } from '../utils/interfaces'
import type { CantinaEvent } from './cantina'

export interface SwEvent {
  event_channel: string
  timestamp: number
}

export interface EmitterContract<
  EventTypes extends EventEmitter.ValidEventTypes
> {
  on<T extends EventEmitter.EventNames<EventTypes>>(
    event: T,
    fn: EventEmitter.EventListener<EventTypes, T>
  ): EmitterContract<EventTypes>

  once<T extends EventEmitter.EventNames<EventTypes>>(
    event: T,
    fn: EventEmitter.EventListener<EventTypes, T>
  ): EmitterContract<EventTypes>

  off<T extends EventEmitter.EventNames<EventTypes>>(
    event: T,
    fn?: EventEmitter.EventListener<EventTypes, T>
  ): EmitterContract<EventTypes>
}

export interface BaseComponentContract {
  destroy(): void
}

export interface BaseConnectionContract<
  EventTypes extends EventEmitter.ValidEventTypes
> extends EmitterContract<EventTypes> {
  /** The id of the video device, or null if not available */
  get cameraId(): string | null
  /** The label of the video device, or null if not available */
  get cameraLabel(): string | null
  /**
   * Provides access to the local audio
   * [MediaStreamTrack](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack).
   */
  get localAudioTrack(): MediaStreamTrack | null
  /** Provides access to the local [MediaStream](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream) */
  get localStream(): MediaStream | undefined
  /**
   * Provides access to the local video
   * [MediaStreamTrack](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack).
   */
  get localVideoTrack(): MediaStreamTrack | null
  /** The id of the audio input device, or null if not available */
  get microphoneId(): string | null
  /** The label of the audio input device, or null if not available */
  get microphoneLabel(): string | null
  /**
   * Provides access to the remote [MediaStream](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream)
   */
  get remoteStream(): MediaStream | undefined
  /** The unique identifier for the room */
  get roomId(): string
  /** The unique identifier for the room session */
  get roomSessionId(): string
  /** Whether the connection is currently active */
  get active(): boolean
  /** The id of the current member within the room */
  get memberId(): string

  updateCamera(constraints: MediaTrackConstraints): Promise<void>
  updateMicrophone(constraints: MediaTrackConstraints): Promise<void>

  /** @internal */
  stopOutboundAudio(): void
  /** @internal */
  restoreOutboundAudio(): void
  /** @internal */
  stopOutboundVideo(): void
  /** @internal */
  restoreOutboundVideo(): void
}

export interface ConsumerContract<
  EventTypes extends EventEmitter.ValidEventTypes,
  SubscribeType = void
> extends EmitterContract<EventTypes> {
  subscribe(): Promise<SubscribeType>
}

export interface ClientContract<
  ClientInstance,
  EventTypes extends EventEmitter.ValidEventTypes
> extends EmitterContract<EventTypes> {
  connect(): Promise<ClientInstance>
  disconnect(): void
}

export interface WebRTCMessageParams extends SwEvent {
  event_type: 'webrtc.message'
  project_id: string
  node_id: string
  params: JSONRPCRequest
}

// prettier-ignore
export type SwEventParams =
  | VideoAPIEventParams
  | WebRTCMessageParams
  | CantinaEvent

// prettier-ignore
export type PubSubChannelEvents =
  | InternalVideoEventNames
  | SessionEvents

export * from './video'
export * from './utils'
export * from './cantina'
