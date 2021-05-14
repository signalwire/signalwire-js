import { Store } from 'redux'
import { Session } from '../Session'

export interface Emitter<EventType, Instance = {}> {
  on(eventName: EventType, handler: Function, once?: boolean): Instance
  once(eventName: EventType, handler: Function): Instance
  off(eventName: EventType, handler?: Function): Instance
  emit(eventName: EventType, ...args: any[]): boolean
  removeAllListeners(): Instance
}

type JSONRPCParams = {
  [key: string]: any
}

type JSONRPCResult = {
  [key: string]: any
}

type JSONRPCError = {
  [key: string]: any
}

export interface JSONRPCRequest {
  jsonrpc: '2.0'
  id: string
  method: string
  params?: JSONRPCParams
}

export interface JSONRPCResponse {
  jsonrpc: '2.0'
  id: string
  result?: JSONRPCResult
  error?: JSONRPCError
}

export interface SessionOptions {
  host?: string
  project?: string
  token: string
  autoConnect?: boolean
}

export interface UserOptions<T = {}, EventType extends string = string>
  extends SessionOptions {
  devTools?: boolean
  emitter?: Emitter<EventType, T>
}

export interface BaseClientOptions<
  T = {},
  EventType extends string = ClientEvents
> extends UserOptions<T, EventType> {
  emitter: Emitter<EventType, T>
}

export interface BaseComponentOptions<
  T = {},
  EventType extends string = string
> {
  store: Store
  emitter: Emitter<EventType, T>
}

export interface SessionRequestObject {
  rpcRequest: JSONRPCRequest
  resolve: (value: unknown) => void
  reject: (value: unknown) => void
}

export interface SessionRequestQueued {
  resolve: (value: unknown) => void
  msg: JSONRPCRequest | JSONRPCResponse
}

export interface IBladeAuthorization {
  type: 'video'
  project: string
  scopes: string[]
  scope_id: string
  resource: string
  user_name: string
  room?: {
    name: string
    scopes: string[]
  }
  signature: string
  expires_at?: number
}

export interface IBladeConnectResult {
  session_restored: boolean
  sessionid: string
  nodeid: string
  identity: string
  master_nodeid: string
  authorization: IBladeAuthorization
  result?: {
    protocol: string
    iceServers?: RTCIceServer[]
  }
}

export type SessionConstructor = typeof Session

export type SessionAuthStatus =
  | 'unknown'
  | 'authorizing'
  | 'authorized'
  | 'unauthorized'

// TODO: define proper list of statuses
export type SessionStatus =
  | 'unknown'
  | 'reconnecting'
  | 'connected'
  | 'disconnected'

export type SessionEvents = `session.${SessionStatus}`

/**
 * List of all the events the client can listen to.
 */
export type ClientEvents = SessionEvents

export type LayoutEvent = 'changed'

// prettier-ignore
export type RoomEvent =
  | 'ended'
  | 'started'
  | 'subscribed'
  | 'updated'

// prettier-ignore
export type MemberEventExpanded = `updated.${keyof RoomMember}`

// prettier-ignore
export type MemberEvent =
  | 'joined'
  | 'left'
  | 'updated'
  | MemberEventExpanded

export type CallState =
  | 'active'
  | 'answering'
  | 'destroy'
  | 'early'
  | 'hangup'
  | 'held'
  | 'new'
  | 'purge'
  | 'recovering'
  | 'requesting'
  | 'ringing'
  | 'track'
  | 'trying'

/**
 * List of all the events the call can listen to
 */
export type CallEvents =
  | `layout.${LayoutEvent}`
  | `member.${MemberEvent}`
  | `room.${RoomEvent}`
  | CallState

export type SessionAuthError = {
  code: number
  error: string
}

export interface RoomLayout {
  id: string
  name?: string
}

export interface RoomMemberLocation {
  y: number
  x: number
  layer_index: number
  z_index: number
  height: number
  width: number
}

export interface RoomMember {
  id: string
  room_session_id: string
  room_id: string
  type: 'member'
  visible: boolean
  audio_muted: boolean
  video_muted: boolean
  name: string
  location: RoomMemberLocation
}

export interface Room {
  room_id: string
  room_session_id: string
  name: string
  members: RoomMember[]
  locked: boolean
  layouts: RoomLayout[]
}

interface RoomSubscribedEvent {
  event_type: 'room.subscribed'
  params: {
    room: Room
    call_id: string
    member_id: string
  }
  // TODO: check with backend why timestamp string
  timestamp: string
  event_channel: string
}

interface MemberUpdated {
  event_type: 'member.updated'
  params: {
    member: RoomMember & {
      updated: (keyof RoomMember)[]
    }
    call_id: string
    member_id: string
  }
  // TODO: check with backend why timestamp string
  timestamp: string
  event_channel: string
}

// prettier-ignore
export type ConferenceWorkerParams =
  | RoomSubscribedEvent
  | MemberUpdated
