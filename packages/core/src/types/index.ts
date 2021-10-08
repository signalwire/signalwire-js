import type { EventEmitter } from '../utils/EventEmitter'
import type { VideoAPIEventParams, InternalVideoEventNames } from './video'
import type { SessionEvents, JSONRPCRequest } from '../utils/interfaces'
import { CantinaEventParams } from './cantina'

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

export interface BaseConnectionContract<
  EventTypes extends EventEmitter.ValidEventTypes
> extends EmitterContract<EventTypes> {
  // TODO: remove this property and move logic into BaseConnection.hangup()
  active: boolean
  // TODO: remove these
  stopOutboundAudio: any
  restoreOutboundAudio: any
  restoreOutboundVideo: any
  stopOutboundVideo: any
  memberId: string
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
  | CantinaEventParams

// prettier-ignore
export type PubSubChannelEvents =
  | InternalVideoEventNames
  | SessionEvents

export * from './video'
export * from './utils'
export * from './cantina'
