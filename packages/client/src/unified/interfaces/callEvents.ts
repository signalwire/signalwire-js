import {
  // Call Session Events
  CallJoinedEventParams,
  CallStateEventParams,
  CallLeftEventParams,
  CallUpdatedEventParams,
  CallPlayEventParams,
  CallConnectEventParams,
  CallRoomEventParams,
  
  // Member Events
  MemberJoinedEventParams,
  MemberLeftEventParams,
  MemberUpdatedEventParams,
  MemberTalkingEventParams,
  
  // Layout Events
  CallLayoutChangedEventParams,
  
  // Stream Events (from Video SDK)
  VideoStreamStartedEventParams,
  VideoStreamEndedEventParams,
  
  // Playback Events (from Video SDK)
  VideoPlaybackStartedEventParams,
  VideoPlaybackUpdatedEventParams,
  VideoPlaybackEndedEventParams,
  
  // Recording Events (from Video SDK)
  VideoRecordingStartedEventParams,
  VideoRecordingUpdatedEventParams,
  VideoRecordingEndedEventParams,
  
  // Room Subscription Events
} from '@signalwire/core'

/**
 * Call session event handler function type
 */
export type CallEventHandler<T = void> = (params: T) => void | Promise<void>

/**
 * Comprehensive mapping of all Call Fabric SDK events to their handler functions.
 * These event handlers can be passed when dialing to listen to call events.
 * 
 * @example
 * ```typescript
 * const call = await client.dial({
 *   to: 'resource-id',
 *   listen: {
 *     'call.joined': (params) => {
 *       console.log('Call joined', params)
 *     },
 *     'member.joined': (params) => {
 *       console.log('Member joined', params.member)
 *     },
 *     'call.state': (params) => {
 *       console.log('Call state changed to:', params.call_state)
 *     }
 *   }
 * })
 * ```
 */
export interface CallSessionEventHandlers {
  // ========== Call Session Events ==========
  
  /**
   * Fired when the call is successfully joined
   */
  'call.joined': CallEventHandler<CallJoinedEventParams>
  
  /**
   * Fired when the call state changes (created, ringing, answered, ending, ended)
   */
  'call.state': CallEventHandler<CallStateEventParams>
  
  /**
   * Fired when the participant leaves the call
   */
  'call.left': CallEventHandler<CallLeftEventParams>
  
  /**
   * Fired when call session properties are updated
   */
  'call.updated': CallEventHandler<CallUpdatedEventParams>
  
  /**
   * Fired when media playback state changes in the call
   */
  'call.play': CallEventHandler<CallPlayEventParams>
  
  /**
   * Fired when call connection state changes (connecting, connected)
   */
  'call.connect': CallEventHandler<CallConnectEventParams>
  
  /**
   * Fired for room-specific call events
   */
  'call.room': CallEventHandler<CallRoomEventParams>
  
  // ========== Member Events ==========
  
  /**
   * Fired when a new member joins the call
   */
  'member.joined': CallEventHandler<MemberJoinedEventParams>
  
  /**
   * Fired when a member leaves the call
   */
  'member.left': CallEventHandler<MemberLeftEventParams>
  
  /**
   * Fired when a member's properties are updated (generic update)
   */
  'member.updated': CallEventHandler<MemberUpdatedEventParams>
  
  /**
   * Fired when a member starts or stops talking
   */
  'member.talking': CallEventHandler<MemberTalkingEventParams>
  
  // ========== Member Update Sub-events ==========
  
  /**
   * Fired when a member's audio mute state changes
   */
  'member.updated.audioMuted': CallEventHandler<MemberUpdatedEventParams>
  
  /**
   * Fired when a member's video mute state changes
   */
  'member.updated.videoMuted': CallEventHandler<MemberUpdatedEventParams>
  
  /**
   * Fired when a member's deaf state changes
   */
  'member.updated.deaf': CallEventHandler<MemberUpdatedEventParams>
  
  /**
   * Fired when a member's visibility changes
   */
  'member.updated.visible': CallEventHandler<MemberUpdatedEventParams>
  
  /**
   * Fired when a member's input volume changes
   */
  'member.updated.inputVolume': CallEventHandler<MemberUpdatedEventParams>
  
  /**
   * Fired when a member's output volume changes
   */
  'member.updated.outputVolume': CallEventHandler<MemberUpdatedEventParams>
  
  /**
   * Fired when a member's input sensitivity changes
   */
  'member.updated.inputSensitivity': CallEventHandler<MemberUpdatedEventParams>
  
  /**
   * Fired when a member raises or lowers their hand
   */
  'member.updated.handraised': CallEventHandler<MemberUpdatedEventParams>
  
  /**
   * Fired when a member's echo cancellation setting changes
   */
  'member.updated.echoCancellation': CallEventHandler<MemberUpdatedEventParams>
  
  /**
   * Fired when a member's auto gain setting changes
   */
  'member.updated.autoGain': CallEventHandler<MemberUpdatedEventParams>
  
  /**
   * Fired when a member's noise suppression setting changes
   */
  'member.updated.noiseSuppression': CallEventHandler<MemberUpdatedEventParams>
  
  // ========== Layout Events ==========
  
  /**
   * Fired when the call layout changes
   */
  'layout.changed': CallEventHandler<CallLayoutChangedEventParams>
  
  // ========== Stream Events ==========
  
  /**
   * Fired when streaming starts in the call
   */
  'stream.started': CallEventHandler<VideoStreamStartedEventParams>
  
  /**
   * Fired when streaming ends in the call
   */
  'stream.ended': CallEventHandler<VideoStreamEndedEventParams>
  
  // ========== Playback Events ==========
  
  /**
   * Fired when media playback starts in the call
   */
  'playback.started': CallEventHandler<VideoPlaybackStartedEventParams>
  
  /**
   * Fired when media playback is updated
   */
  'playback.updated': CallEventHandler<VideoPlaybackUpdatedEventParams>
  
  /**
   * Fired when media playback ends
   */
  'playback.ended': CallEventHandler<VideoPlaybackEndedEventParams>
  
  // ========== Recording Events ==========
  
  /**
   * Fired when call recording starts
   */
  'recording.started': CallEventHandler<VideoRecordingStartedEventParams>
  
  /**
   * Fired when call recording is updated
   */
  'recording.updated': CallEventHandler<VideoRecordingUpdatedEventParams>
  
  /**
   * Fired when call recording ends
   */
  'recording.ended': CallEventHandler<VideoRecordingEndedEventParams>
  
  // ========== Room Subscription Events ==========
  
  /**
   * Fired when successfully subscribed to a room
   */
  'room.subscribed': CallEventHandler<CallJoinedEventParams>
  
  /**
   * Fired when leaving a room (alternative to call.left)
   */
  'room.left': CallEventHandler<CallLeftEventParams>
}

/**
 * Utility type to extract event names from the handlers
 */
export type CallSessionEventNames = keyof CallSessionEventHandlers

/**
 * Utility type to get the event parameter type for a specific event
 */
export type CallSessionEventPayload<T extends CallSessionEventNames> = 
  CallSessionEventHandlers[T] extends CallEventHandler<infer P> ? P : never

/**
 * Type guard to check if an event name is valid
 */
export function isValidCallSessionEvent(event: string): event is CallSessionEventNames {
  const validEvents: Set<string> = new Set([
    'call.joined',
    'call.state',
    'call.left',
    'call.updated',
    'call.play',
    'call.connect',
    'call.room',
    'member.joined',
    'member.left',
    'member.updated',
    'member.talking',
    'member.updated.audioMuted',
    'member.updated.videoMuted',
    'member.updated.deaf',
    'member.updated.visible',
    'member.updated.inputVolume',
    'member.updated.outputVolume',
    'member.updated.inputSensitivity',
    'member.updated.handraised',
    'member.updated.echoCancellation',
    'member.updated.autoGain',
    'member.updated.noiseSuppression',
    'layout.changed',
    'stream.started',
    'stream.ended',
    'playback.started',
    'playback.updated',
    'playback.ended',
    'recording.started',
    'recording.updated',
    'recording.ended',
    'room.subscribed',
    'room.left',
  ])
  
  return validEvents.has(event)
}

/**
 * Helper type for partial event handlers (useful for dial() params)
 */
export type PartialCallSessionEventHandlers = Partial<CallSessionEventHandlers>

/**
 * Type for event handler registration/unregistration methods
 */
export interface CallSessionEventEmitter {
  /**
   * Register an event handler
   */
  on<T extends CallSessionEventNames>(
    event: T,
    handler: CallSessionEventHandlers[T]
  ): void
  
  /**
   * Register a one-time event handler
   */
  once<T extends CallSessionEventNames>(
    event: T,
    handler: CallSessionEventHandlers[T]
  ): void
  
  /**
   * Unregister an event handler
   */
  off<T extends CallSessionEventNames>(
    event: T,
    handler?: CallSessionEventHandlers[T]
  ): void
  
  /**
   * Emit an event (internal use)
   */
  emit<T extends CallSessionEventNames>(
    event: T,
    params: CallSessionEventPayload<T>
  ): void
}

/**
 * Extended CallSession interface with event emitter capabilities
 */
export interface CallSessionWithEvents extends CallSessionEventEmitter {
  /**
   * Register multiple event handlers at once
   */
  listen(handlers: PartialCallSessionEventHandlers): void
  
  /**
   * Unregister all event handlers for specific events
   */
  unlisten(events?: CallSessionEventNames[]): void
}