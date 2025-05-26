import type { Channel, SagaIterator } from '@redux-saga/types'
import { END, MulticastChannel } from '@redux-saga/core'
import type { PayloadAction } from './toolkit'
import {
  JSONRPCResponse,
  JSONRPCRequest,
  SessionAuthError,
  SessionAuthStatus,
  SessionEvents,
  JSONRPCMethod,
  BaseConnectionState,
  Authorization,
} from '../utils/interfaces'
import type {
  VideoAction,
  ChatAction,
  TaskAction,
  MessagingAction,
  SwEventParams,
  VoiceCallAction,
  VideoManagerAction,
  PubSubEventAction,
  FabricAction,
  SwAuthorizationState,
} from '../types'
import { SDKRunSaga } from '.'

interface SWComponent {
  id: string
  responses?: Record<string, JSONRPCResponse>
  errors?: Record<
    string,
    { action: PayloadAction<any>; jsonrpc: JSONRPCResponse }
  >
}

export interface WebRTCCall extends SWComponent {
  state?: BaseConnectionState
  remoteSDP?: string
  nodeId?: string
  roomId?: string
  roomSessionId?: string
  memberId?: string
  previewUrl?: string
  byeCause?: string
  byeCauseCode?: number
  redirectDestination?: string
  audioConstraints?: MediaTrackConstraints
  videoConstraints?: MediaTrackConstraints
}

export interface Message extends SWComponent {
  state?: string
}

export type ReduxComponent = WebRTCCall | Message

export interface ComponentState {
  byId: {
    [key: string]: ReduxComponent
  }
}

export interface SessionState {
  protocol: string
  iceServers?: RTCIceServer[]
  authStatus: SessionAuthStatus
  authorization?: Authorization
  authorizationState?: SwAuthorizationState
  authError?: SessionAuthError
  authCount: number
}

export interface SDKState {
  components: ComponentState
  session: SessionState
}

export interface ExecuteActionParams {
  requestId?: string
  componentId?: string
  method: JSONRPCMethod
  params: Record<string, any>
}

export interface CustomSagaParams<T> {
  instance: T
  runSaga: SDKRunSaga
}

export type CustomSaga<T> = (params: CustomSagaParams<T>) => SagaIterator<any>

/**
 * Converts from:
 *
 * `{ event_type: <value>, params: <value> }`
 *
 * into
 *
 * `{ type: <value>, payload: <value> }`
 */
export type MapToPubSubShape<T> = {
  [K in keyof T as K extends 'event_type'
    ? 'type'
    : K extends 'params'
    ? 'payload'
    : never]: T[K]
}

export type PubSubAction =
  | VideoAction
  | {
      type: SessionEvents
      payload: Error | undefined
    }
  | VideoManagerAction
  | ChatAction
  | PubSubEventAction
  | TaskAction
  | MessagingAction
  | VoiceCallAction
  | FabricAction

export type SessionChannelAction =
  | PayloadAction<void, SessionEvents>
  | PayloadAction<JSONRPCRequest>
  | PayloadAction<void, 'auth/success'>
  | PayloadAction<void, 'auth/expiring'>
  | PayloadAction<{ error: SessionAuthError }>
  | PayloadAction<{ token: string }>
  | PayloadAction<SessionAuthStatus>

export type SwEventChannel = MulticastChannel<MapToPubSubShape<SwEventParams>>
export type SessionChannel = Channel<SessionChannelAction>

export type SDKActions = MapToPubSubShape<SwEventParams> | END
