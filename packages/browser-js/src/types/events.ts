/**
 * Event Types for @signalwire/browser-js
 * 
 * This module provides clean, prettified event type definitions for the Call Fabric SDK.
 * These types transform the internal event structures into user-friendly interfaces
 * with proper camelCase naming and simplified structures.
 * 
 * Events are organized into categories:
 * - Call Lifecycle Events: joined, updated, left
 * - Call State Events: state changes, play, connect, room
 * - Member Events: joined, updated, left, talking
 * - Layout Events: layout changes
 */

import type { 
  Prettify
} from './utilities'
import type { CallSession, CallSessionMember, CallCapabilities, CallLayout } from './call'
import type {
  FabricCallState,
  FabricCallDirection,
  FabricCallPlayState,
  FabricCallConnectState,
  CallDevice
} from '@signalwire/core'

// =====================================
// Call Lifecycle Events
// =====================================

/**
 * Parameters for the 'call.joined' event.
 * Fired when successfully joining a call session.
 * 
 * @example
 * ```typescript
 * call.on('call.joined', (event: CallJoinedEventParams) => {
 *   console.log('Joined call:', event.call.callId)
 *   console.log('My member:', event.member.id)
 *   console.log('Capabilities:', event.capabilities)
 * })
 * ```
 * 
 * @public
 */
export type CallJoinedEventParams = Prettify<{
  /**
   * The call session that was joined.
   * Contains all call information and methods.
   */
  call: CallSession
  
  /**
   * The member representing this client in the call.
   * This is your own participant information.
   */
  member: CallSessionMember
  
  /**
   * Capabilities granted to this member.
   * Defines what actions can be performed in the call.
   */
  capabilities: CallCapabilities
  
  /**
   * The room ID for this call session.
   * Used for room-based call management.
   */
  roomId: string
  
  /**
   * The room session ID for this call.
   * Unique identifier for this specific session.
   */
  roomSessionId: string
  
  /**
   * The call ID for this session.
   * Primary identifier for the call.
   */
  callId: string
  
  /**
   * The member ID for this participant.
   * Your unique identifier in the call.
   */
  memberId: string
  
  /**
   * Original call ID if this is a transferred call.
   * Used for call history tracking.
   */
  originCallId: string
}>

/**
 * The 'call.joined' event.
 * Emitted when successfully joining a call session.
 * 
 * @public
 */
export type CallJoinedEvent = {
  type: 'call.joined'
  params: CallJoinedEventParams
}

/**
 * Parameters for the 'call.updated' event.
 * Fired when call session properties change.
 * 
 * @example
 * ```typescript
 * call.on('call.updated', (event: CallUpdatedEventParams) => {
 *   console.log('Call updated:', event.call.displayName)
 *   console.log('Recording:', event.call.recording)
 * })
 * ```
 * 
 * @public
 */
export type CallUpdatedEventParams = Prettify<{
  /**
   * The updated call session.
   * Contains the latest call state and properties.
   */
  call: CallSession
  
  /**
   * The room ID for this call session.
   */
  roomId: string
  
  /**
   * The room session ID for this call.
   */
  roomSessionId: string
}>

/**
 * The 'call.updated' event.
 * Emitted when call session properties change.
 * 
 * @public
 */
export type CallUpdatedEvent = {
  type: 'call.updated'
  params: CallUpdatedEventParams
}

/**
 * Parameters for the 'call.left' event.
 * Fired when leaving a call session.
 * 
 * @example
 * ```typescript
 * call.on('call.left', (event: CallLeftEventParams) => {
 *   console.log('Left call:', event.callId)
 *   console.log('Reason:', event.reason)
 * })
 * ```
 * 
 * @public
 */
export type CallLeftEventParams = Prettify<{
  /**
   * The call session that was left.
   * May be partial if disconnect was abrupt.
   */
  call: CallSession
  
  /**
   * The room ID for this call session.
   */
  roomId: string
  
  /**
   * The room session ID for this call.
   */
  roomSessionId: string
  
  /**
   * The call ID that was left.
   */
  callId: string
  
  /**
   * The member ID that left.
   */
  memberId: string
  
  /**
   * Original call ID if this was a transferred call.
   */
  originCallId: string
  
  /**
   * Reason for leaving the call.
   * Examples: 'hangup', 'network_error', 'kicked', 'timeout'
   */
  reason: string
}>

/**
 * The 'call.left' event.
 * Emitted when leaving a call session.
 * 
 * @public
 */
export type CallLeftEvent = {
  type: 'call.left'
  params: CallLeftEventParams
}

// =====================================
// Call State Events
// =====================================

/**
 * Parameters for the 'call.state' event.
 * Fired when the call state changes.
 * 
 * @example
 * ```typescript
 * call.on('call.state', (event: CallStateEventParams) => {
 *   console.log('Call state:', event.callState)
 *   console.log('Direction:', event.direction)
 *   if (event.callState === 'answered') {
 *     console.log('Call answered at:', event.answerTime)
 *   }
 * })
 * ```
 * 
 * @public
 */
export type CallStateEventParams = Prettify<{
  /**
   * The call ID this state change applies to.
   */
  callId: string
  
  /**
   * The node ID handling this call.
   */
  nodeId: string
  
  /**
   * The call segment ID.
   */
  segmentId: string
  
  /**
   * Current state of the call.
   * Possible values: 'created', 'ringing', 'answered', 'ending', 'ended'
   */
  callState: FabricCallState
  
  /**
   * Direction of the call.
   * Either 'inbound' or 'outbound'
   */
  direction: FabricCallDirection
  
  /**
   * Device information for this call leg.
   * Contains type and parameters for the device.
   */
  device: CallDevice
  
  /**
   * Unix timestamp when the call started.
   */
  startTime: number
  
  /**
   * Unix timestamp when the call was answered.
   * 0 if not yet answered.
   */
  answerTime: number
  
  /**
   * Unix timestamp when the call ended.
   * 0 if still active.
   */
  endTime: number
  
  /**
   * The room session ID for this call.
   */
  roomSessionId: string
}>

/**
 * The 'call.state' event.
 * Emitted when the call state changes.
 * 
 * @public
 */
export type CallStateEvent = {
  type: 'call.state'
  params: CallStateEventParams
}

/**
 * Parameters for the 'call.play' event.
 * Fired when media playback state changes.
 * 
 * @example
 * ```typescript
 * call.on('call.play', (event: CallPlayEventParams) => {
 *   console.log('Playback state:', event.state)
 *   console.log('Control ID:', event.controlId)
 * })
 * ```
 * 
 * @public
 */
export type CallPlayEventParams = Prettify<{
  /**
   * Control ID for this playback session.
   * Used to control playback operations.
   */
  controlId: string
  
  /**
   * The call ID this playback is associated with.
   */
  callId: string
  
  /**
   * The node ID handling this playback.
   */
  nodeId: string
  
  /**
   * Current playback state.
   * Possible values: 'playing', 'paused', 'finished'
   */
  state: FabricCallPlayState
  
  /**
   * The room session ID for this call.
   */
  roomSessionId: string
}>

/**
 * The 'call.play' event.
 * Emitted when media playback state changes.
 * 
 * @public
 */
export type CallPlayEvent = {
  type: 'call.play'
  params: CallPlayEventParams
}

/**
 * Parameters for the 'call.connect' event.
 * Fired when call connection state changes.
 * 
 * @example
 * ```typescript
 * call.on('call.connect', (event: CallConnectEventParams) => {
 *   console.log('Connect state:', event.connectState)
 *   if (event.peer) {
 *     console.log('Connected to:', event.peer.device)
 *   }
 * })
 * ```
 * 
 * @public
 */
export type CallConnectEventParams = Prettify<{
  /**
   * Current connection state.
   * Either 'connecting' or 'connected'
   */
  connectState: FabricCallConnectState
  
  /**
   * The call ID for this connection.
   */
  callId: string
  
  /**
   * The node ID handling this connection.
   */
  nodeId: string
  
  /**
   * The call segment ID.
   */
  segmentId: string
  
  /**
   * The room session ID for this call.
   */
  roomSessionId: string
  
  /**
   * Information about the connected peer.
   * Available when connectState is 'connected'.
   */
  peer?: {
    /**
     * Peer's call ID.
     */
    callId: string
    
    /**
     * Peer's node ID.
     */
    nodeId: string
    
    /**
     * Peer's device information.
     */
    device: CallDevice
  }
}>

/**
 * The 'call.connect' event.
 * Emitted when call connection state changes.
 * 
 * @public
 */
export type CallConnectEvent = {
  type: 'call.connect'
  params: CallConnectEventParams
}

/**
 * Parameters for the 'call.room' event.
 * Fired when room join status changes.
 * 
 * @example
 * ```typescript
 * call.on('call.room', (event: CallRoomEventParams) => {
 *   console.log('Room join status:', event.joinedStatus)
 * })
 * ```
 * 
 * @public
 */
export type CallRoomEventParams = Prettify<{
  /**
   * Status of joining the room.
   * Examples: 'joining', 'joined', 'failed'
   */
  joinedStatus: string
  
  /**
   * The call ID for this room event.
   */
  callId: string
  
  /**
   * The node ID handling this call.
   */
  nodeId: string
  
  /**
   * The call segment ID.
   */
  segmentId: string
  
  /**
   * The room session ID.
   */
  roomSessionId: string
}>

/**
 * The 'call.room' event.
 * Emitted when room join status changes.
 * 
 * @public
 */
export type CallRoomEvent = {
  type: 'call.room'
  params: CallRoomEventParams
}

// =====================================
// Member Events
// =====================================

/**
 * Parameters for the 'member.joined' event.
 * Fired when a new member joins the call.
 * 
 * @example
 * ```typescript
 * call.on('member.joined', (event: CallMemberJoinedEventParams) => {
 *   console.log('Member joined:', event.member.name)
 *   console.log('Member type:', event.member.type)
 * })
 * ```
 * 
 * @public
 */
export type CallMemberJoinedEventParams = Prettify<{
  /**
   * The member that joined the call.
   * Contains all member information and state.
   */
  member: CallSessionMember
  
  /**
   * The room ID for this call session.
   */
  roomId: string
  
  /**
   * The room session ID for this call.
   */
  roomSessionId: string
}>

/**
 * The 'member.joined' event.
 * Emitted when a new member joins the call.
 * 
 * @public
 */
export type CallMemberJoinedEvent = {
  type: 'member.joined'
  params: CallMemberJoinedEventParams
}

/**
 * Parameters for the 'member.updated' event.
 * Fired when a member's properties change.
 * 
 * @example
 * ```typescript
 * call.on('member.updated', (event: CallMemberUpdatedEventParams) => {
 *   console.log('Member updated:', event.member.name)
 *   console.log('Changed properties:', event.updated)
 *   
 *   if (event.updated.includes('audioMuted')) {
 *     console.log('Audio muted:', event.member.audioMuted)
 *   }
 * })
 * ```
 * 
 * @public
 */
export type CallMemberUpdatedEventParams = Prettify<{
  /**
   * The member that was updated.
   * Contains the latest member state.
   */
  member: CallSessionMember
  
  /**
   * Array of property names that were updated.
   * Examples: ['audioMuted', 'videoMuted', 'visible', 'handraised']
   */
  updated: string[]
  
  /**
   * The room ID for this call session.
   */
  roomId: string
  
  /**
   * The room session ID for this call.
   */
  roomSessionId: string
}>

/**
 * The 'member.updated' event.
 * Emitted when a member's properties change.
 * 
 * @public
 */
export type CallMemberUpdatedEvent = {
  type: 'member.updated'
  params: CallMemberUpdatedEventParams
}

/**
 * Parameters for the 'member.left' event.
 * Fired when a member leaves the call.
 * 
 * @example
 * ```typescript
 * call.on('member.left', (event: CallMemberLeftEventParams) => {
 *   console.log('Member left:', event.member.name)
 *   console.log('Reason:', event.reason)
 * })
 * ```
 * 
 * @public
 */
export type CallMemberLeftEventParams = Prettify<{
  /**
   * The member that left the call.
   * Contains member information at time of leaving.
   */
  member: CallSessionMember
  
  /**
   * The room ID for this call session.
   */
  roomId: string
  
  /**
   * The room session ID for this call.
   */
  roomSessionId: string
  
  /**
   * Reason the member left.
   * Examples: 'hangup', 'network_error', 'kicked', 'timeout'
   */
  reason: string
}>

/**
 * The 'member.left' event.
 * Emitted when a member leaves the call.
 * 
 * @public
 */
export type CallMemberLeftEvent = {
  type: 'member.left'
  params: CallMemberLeftEventParams
}

/**
 * Parameters for the 'member.talking' event.
 * Fired when a member's talking state changes.
 * 
 * @example
 * ```typescript
 * call.on('member.talking', (event: CallMemberTalkingEventParams) => {
 *   console.log('Member ID:', event.member.memberId)
 *   console.log('Is talking:', event.member.talking)
 * })
 * ```
 * 
 * @public
 */
export type CallMemberTalkingEventParams = Prettify<{
  /**
   * The room ID for this call session.
   */
  roomId: string
  
  /**
   * The room session ID for this call.
   */
  roomSessionId: string
  
  /**
   * Member talking state information.
   */
  member: {
    /**
     * The member ID that changed talking state.
     */
    memberId: string
    
    /**
     * Whether the member is currently talking.
     * true when speaking, false when silent.
     */
    talking: boolean
    
    /**
     * The node ID handling this member.
     */
    nodeId: string
  }
}>

/**
 * The 'member.talking' event.
 * Emitted when a member's talking state changes.
 * 
 * @public
 */
export type CallMemberTalkingEvent = {
  type: 'member.talking'
  params: CallMemberTalkingEventParams
}

// =====================================
// Layout Events
// =====================================

/**
 * Parameters for the 'layout.changed' event.
 * Fired when the video layout changes.
 * 
 * @example
 * ```typescript
 * call.on('layout.changed', (event: CallLayoutChangedEventParams) => {
 *   console.log('New layout:', event.layout.name)
 *   console.log('Layers:', event.layout.layers.length)
 *   
 *   event.layout.layers.forEach(layer => {
 *     console.log(`Position ${layer.position}: ${layer.memberId}`)
 *   })
 * })
 * ```
 * 
 * @public
 */
export type CallLayoutChangedEventParams = Prettify<{
  /**
   * The room ID for this call session.
   */
  roomId: string
  
  /**
   * The room session ID for this call.
   */
  roomSessionId: string
  
  /**
   * The new layout configuration.
   * Contains layout name and layer positions.
   */
  layout: CallLayout
}>

/**
 * The 'layout.changed' event.
 * Emitted when the video layout changes.
 * 
 * @public
 */
export type CallLayoutChangedEvent = {
  type: 'layout.changed'
  params: CallLayoutChangedEventParams
}

// =====================================
// Event Union Types
// =====================================

/**
 * All possible call event parameter types.
 * @public
 */
export type CallEventParams = 
  | CallJoinedEventParams
  | CallUpdatedEventParams
  | CallLeftEventParams
  | CallStateEventParams
  | CallPlayEventParams
  | CallConnectEventParams
  | CallRoomEventParams
  | CallMemberJoinedEventParams
  | CallMemberUpdatedEventParams
  | CallMemberLeftEventParams
  | CallMemberTalkingEventParams
  | CallLayoutChangedEventParams

/**
 * All possible call events.
 * @public
 */
export type CallEvent =
  | CallJoinedEvent
  | CallUpdatedEvent
  | CallLeftEvent
  | CallStateEvent
  | CallPlayEvent
  | CallConnectEvent
  | CallRoomEvent
  | CallMemberJoinedEvent
  | CallMemberUpdatedEvent
  | CallMemberLeftEvent
  | CallMemberTalkingEvent
  | CallLayoutChangedEvent

/**
 * Event handler map for call events.
 * Maps event types to their handler functions.
 * 
 * @example
 * ```typescript
 * const handlers: CallEventHandlers = {
 *   'call.joined': (params) => console.log('Joined:', params.call.callId),
 *   'member.joined': (params) => console.log('Member:', params.member.name),
 *   'layout.changed': (params) => console.log('Layout:', params.layout.name)
 * }
 * ```
 * 
 * @public
 */
export type CallEventHandlers = {
  'call.joined': (params: CallJoinedEventParams) => void
  'call.updated': (params: CallUpdatedEventParams) => void
  'call.left': (params: CallLeftEventParams) => void
  'call.state': (params: CallStateEventParams) => void
  'call.play': (params: CallPlayEventParams) => void
  'call.connect': (params: CallConnectEventParams) => void
  'call.room': (params: CallRoomEventParams) => void
  'member.joined': (params: CallMemberJoinedEventParams) => void
  'member.updated': (params: CallMemberUpdatedEventParams) => void
  'member.left': (params: CallMemberLeftEventParams) => void
  'member.talking': (params: CallMemberTalkingEventParams) => void
  'layout.changed': (params: CallLayoutChangedEventParams) => void
}

/**
 * All possible event type names.
 * @public
 */
export type CallEventName = keyof CallEventHandlers