import { Store } from 'redux'
import type { EventEmitter } from '../utils/EventEmitter'
import { BaseSession } from '../BaseSession'

/**
 * Minimal interface the emitter must fulfill
 */
export type Emitter = Pick<
  EventEmitter,
  'on' | 'off' | 'once' | 'emit' | 'removeAllListeners'
>

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

export interface UserOptions extends SessionOptions {
  devTools?: boolean
  emitter?: Emitter
}

/**
 * `UserOptions` is exposed to the end user and `BaseClientOptions` is
 * the interface we use internally that extends the options provided.
 * @internal
 */
export interface BaseClientOptions extends UserOptions {
  store: Store
  emitter: Emitter
}

export interface BaseComponentOptions {
  store: Store
  emitter: Emitter
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

export type SessionConstructor = typeof BaseSession

export type SessionAuthStatus =
  | 'unknown'
  | 'authorizing'
  | 'authorized'
  | 'unauthorized'

export type SessionStatus =
  | 'unknown'
  | 'idle'
  | 'reconnecting'
  | 'connected'
  | 'disconnected'

export type SessionEvents = `session.${SessionStatus}`

/**
 * List of all the events the client can listen to.
 */
export type ClientEvents = Record<SessionEvents, () => void>

type LayoutEvent = 'changed'

// prettier-ignore
type RoomEvent =
  | 'ended'
  | 'started'
  | 'subscribed'
  | 'updated'

type MemberJoinedEventName = 'member.joined'
type MemberLeftEventName = 'member.left'
type MemberUpdatedEventName = 'member.updated'
type RoomMemberEventNames = `${MemberUpdatedEventName}.${keyof RoomMember}`
type MemberTalkingEventNames =
  | 'member.talking'
  | 'member.talking.start'
  | 'member.talking.stop'

export type RTCTrackEventName = 'track'

export type BaseConnectionState =
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
  | 'trying'

type LayoutEvents = `layout.${LayoutEvent}`
type MemberEvents =
  | MemberJoinedEventName
  | MemberLeftEventName
  | MemberUpdatedEventName
  | RoomMemberEventNames
  | MemberTalkingEventNames
type RoomEvents = `room.${RoomEvent}`
/**
 * List of all the events the call can listen to
 */
export type RoomEventNames =
  | LayoutEvents
  | MemberEvents
  | RoomEvents
  | RTCTrackEventName

export type EventsHandlerMapping = Record<
  LayoutEvents,
  (params: { layout: RoomLayout }) => void
> &
  Record<MemberJoinedEventName, (params: { member: RoomMember }) => void> &
  Record<MemberLeftEventName, (params: { member: RoomMemberCommon }) => void> &
  Record<
    MemberUpdatedEventName | RoomMemberEventNames,
    (params: MemberUpdated['params']) => void
  > &
  Record<MemberTalkingEventNames, (params: MemberTalking['params']) => void> &
  Record<RoomEvents, (params: RoomEventParams) => void> &
  Record<RTCTrackEventName, (event: RTCTrackEvent) => void>

export type SessionAuthError = {
  code: number
  error: string
}

export interface RoomLayout {
  id: string
  name: string
  layers: RoomLayoutLayer[]
  layer_count?: number
}

export interface RoomLayoutLayer {
  y: number
  x: number
  layer_index: number
  z_index: number
  height: number
  width: number
  member_id: string
}

type RoomMemberType = 'member' | 'screen'
interface RoomMemberCommon {
  id: string
  room_session_id: string
  room_id: string
}
interface RoomMemberProperties {
  scope_id: string
  input_volume: number
  input_sensitivity: number
  output_volume: number
  on_hold: boolean
  deaf: boolean
  // FIXME: review this for different types
  type: RoomMemberType
  visible: boolean
  audio_muted: boolean
  video_muted: boolean
  name: string
}

export type RoomMember = RoomMemberCommon &
  RoomMemberProperties & {
    type: 'member'
  }
export type RoomScreenShare = RoomMember & {
  parent_id: string
  type: 'screen'
}

export interface Room {
  blind_mode: boolean
  hide_video_muted: boolean
  locked: boolean
  logos_visible: boolean
  meeting_mode: boolean
  members: RoomMember[]
  name: string
  recording: boolean
  room_id: string
  room_session_id: string
  silent_mode: boolean
}

interface RoomEventParams {
  room: Room
  call_id: string
  member_id: string
}

interface RoomSubscribedEvent {
  event_type: 'room.subscribed'
  params: RoomEventParams
  timestamp: number
  event_channel: string
}

interface MemberUpdated {
  event_type: 'member.updated'
  params: {
    member: {
      updated: Array<keyof RoomMemberProperties>
    } & RoomMemberCommon &
      Partial<RoomMemberProperties>
  }
  timestamp: number
  event_channel: string
}

interface MemberTalking {
  event_type: Extract<'member.talking', MemberTalkingEventNames>
  params: {
    member: RoomMemberCommon & {
      talking: boolean
    }
  }
  timestamp: number
  event_channel: string
}

// prettier-ignore
export type ConferenceWorkerParams =
  | RoomSubscribedEvent
  | MemberUpdated
  | MemberTalking

interface ConferenceEvent {
  broadcaster_nodeid: string
  protocol: string
  channel: 'notifications'
  event: 'conference'
  params: ConferenceWorkerParams
}

interface VertoEvent {
  broadcaster_nodeid: string
  protocol: string
  channel: 'notifications'
  event: 'queuing.relay.events'
  params: {
    event_type: 'webrtc.message'
    event_channel: string
    timestamp: number
    project_id: string
    node_id: string
    params: JSONRPCRequest
  }
}

interface TaskEvent {
  broadcaster_nodeid: string
  protocol: string
  channel: 'notifications'
  event: 'queuing.relay.tasks'
  params: Record<string, any>
}

interface MessagingEvent {
  broadcaster_nodeid: string
  protocol: string
  channel: 'notifications'
  event: 'queuing.relay.messaging'
  params: Record<string, any>
}

// prettier-ignore
export type BladeBroadcastParams =
  | ConferenceEvent
  | VertoEvent
  | TaskEvent
  | MessagingEvent

/**
 * List of all room member methods
 */
type RoomMemberMethod =
  | 'member.audio_mute'
  | 'member.audio_unmute'
  | 'member.video_mute'
  | 'member.video_unmute'
  | 'member.deaf'
  | 'member.undeaf'
  | 'member.set_input_volume'
  | 'member.set_output_volume'
  | 'member.set_input_sensitivity'
  | 'member.remove'

/**
 * List of all room layout methods
 */
// prettier-ignore
type RoomLayoutMethod =
  | 'set_layout'

/**
 * List of all room member methods
 */
export type RoomMethod =
  | 'video.list_available_layouts'
  | 'video.hide_video_muted'
  | 'video.show_video_muted'
  | `video.${RoomMemberMethod}`
  | `video.${RoomLayoutMethod}`

/**
 * List of all available blade.execute methods
 */
// prettier-ignore
export type BladeExecuteMethod =
  | RoomMethod
  | 'video.message'
  | 'signalwire.subscribe'

export interface WebSocketClient {
  addEventListener: WebSocket['addEventListener']
  send: WebSocket['send']
  close: WebSocket['close']
  readyState: WebSocket['readyState']
}
export interface WebSocketAdapter {
  new (url: string, protocols?: string | string[]): WebSocketClient
}

export type ExecuteParams = {
  method: BladeExecuteMethod
  params: Record<string, any>
}
