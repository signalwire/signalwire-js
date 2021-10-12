import type { EventEmitter } from '../utils/EventEmitter'
import type { VideoAPIEventParams, InternalVideoEventNames } from './video'
import type { SessionEvents, JSONRPCRequest } from '../utils/interfaces'

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
  cameraId: string | null
  cameraLabel: string | null
  localAudioTrack: MediaStreamTrack | null
  localStream: MediaStream | undefined
  localVideoTrack: MediaStreamTrack | null
  microphoneId: string | null
  microphoneLabel: string | null
  remoteStream: MediaStream | undefined
  roomId: string
  roomSessionId: string
  trying: boolean
  active: boolean
  memberId: string
  updateCamera(constraints: MediaTrackConstraints): Promise<void>
  updateMicrophone(constraints: MediaTrackConstraints): Promise<void>
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

// prettier-ignore
export type PubSubChannelEvents =
  | InternalVideoEventNames
  | SessionEvents

export * from './video'
export * from './utils'
