/**
 * Call Types for @signalwire/browser-js
 * 
 * This module provides clean, prettified type definitions for CallSession and CallSessionMember
 * that present a user-friendly public API while maintaining full type safety with the underlying
 * @signalwire/core implementation.
 * 
 * These types use the Prettify utility to expand complex nested types into flat, readable
 * structures for better IDE tooltips and developer experience.
 */

import type { 
  Prettify, 
  StripInternal
} from './utilities'
import type { CallSessionContract, CallSessionMemberContract } from '../utils/interfaces'
import type { CallCapabilitiesContract } from '../interfaces/capabilities'

/**
 * Represents an active call session in the Call Fabric SDK.
 * 
 * A CallSession provides access to call management functionality including:
 * - Call state and lifecycle management (start, answer, hangup)
 * - Member management and interaction
 * - Media control (audio/video mute, volume, etc.)
 * - Layout and position management
 * - Screen sharing and device management
 * 
 * The CallSession supports multiple call types through Call Fabric addresses:
 * - PSTN calls (traditional phone numbers)
 * - SIP calls (VoIP endpoints) 
 * - SWML calls (script-driven calls)
 * - Room/Conference calls (multi-party WebRTC)
 * 
 * @example
 * ```typescript
 * import { SignalWire } from '@signalwire/browser-js'
 * 
 * const client = await SignalWire({ token: 'your-token' })
 * const call = await client.dial({ to: '/public/support' })
 * 
 * // Access call information
 * console.log('Call ID:', call.callId)
 * console.log('My member:', call.selfMember)
 * 
 * // Handle call events
 * call.on('member.joined', (event) => {
 *   console.log(`${event.member.name} joined the call`)
 * })
 * ```
 * 
 * @public
 */
export type CallSession = Prettify<
  StripInternal<CallSessionContract> & {
    /**
     * Unique identifier for this call session.
     * Used to reference this specific call in API operations.
     */
    callId: string

    /**
     * The current member representing this client in the call.
     * Contains information about your own participant state.
     */
    selfMember?: CallSessionMember

    /**
     * Current member instance for this call session.
     * Represents the primary member object for this participant.
     */
    member: CallSessionMember

    /**
     * Capabilities available to this call session.
     * Defines what actions this participant can perform (mute, layout control, etc.).
     */
    capabilities?: CallCapabilities

    /**
     * Current layout information for the call.
     * Contains position and layout details for video calls.
     */
    currentLayout?: CallLayout

    /**
     * Current position of this member in the layout.
     * Used for video call positioning and layout management.
     */
    currentPosition?: string

    // Core call management methods
    /**
     * Starts an outbound call or joins a room.
     * Establishes the WebRTC connection and begins media flow.
     */
    start(): Promise<void>

    /**
     * Answers an incoming call.
     * Accepts the call invitation and starts media flow.
     */
    answer(): Promise<void>

    /**
     * Hangs up the call and disconnects.
     * Terminates the call session and cleans up resources.
     * 
     * @param id - Optional peer ID to disconnect only that peer
     */
    hangup(id?: string): Promise<void>
  }
>

/**
 * Represents a member (participant) in a call session.
 * 
 * CallSessionMember provides access to participant information and state including:
 * - Identity and metadata (name, type, subscriber data)
 * - Media status (audio/video muted, talking, visible)
 * - Position and layout information
 * - Status flags (hand raised, deaf)
 * - Volume and sensitivity controls
 * 
 * Members can represent different types of participants:
 * - 'member': Regular participant with audio/video
 * - 'screen': Screen sharing session
 * - 'device': Additional device (camera, microphone)
 * 
 * @example
 * ```typescript
 * // Access member information
 * console.log('Member name:', member.name)
 * console.log('Is talking:', member.talking)
 * console.log('Audio muted:', member.audioMuted)
 * 
 * // Check member type
 * if (member.type === 'screen') {
 *   console.log('This is a screen share')
 * }
 * 
 * // Access metadata
 * console.log('Custom data:', member.meta)
 * ```
 * 
 * @public
 */
export type CallSessionMember = Prettify<
  StripInternal<CallSessionMemberContract> & {
    /**
     * Unique identifier for this member.
     * Used to reference this member in API operations.
     */
    id: string

    /**
     * The call ID this member belongs to.
     * Links this member to their parent call session.
     */
    callId: string

    /**
     * The node ID where this member is connected.
     * Used for internal routing and connection management.
     */
    nodeId: string

    /**
     * Alias for id - unique member identifier.
     * Provided for backwards compatibility.
     */
    memberId: string

    /**
     * Room session ID this member belongs to.
     * Used for room-based call management.
     */
    roomSessionId: string

    /**
     * Room ID for this member.
     * Used for room-based call management.
     */
    roomId: string

    /**
     * Parent member ID for hierarchical member relationships.
     * Used when members have parent-child relationships (like screen shares).
     */
    parentId?: string

    // Member Information
    /**
     * Display name for this member.
     * Human-readable name shown in UI and events.
     */
    name: string

    /**
     * Type of member participation.
     * - 'member': Regular audio/video participant
     * - 'screen': Screen sharing session
     * - 'device': Additional device (camera, microphone)
     */
    type: 'member' | 'screen' | 'device'

    // Layout and Position
    /**
     * Current position of this member in the video layout.
     * String-based position identifier (e.g., "1", "2", "3").
     */
    currentPosition?: string

    /**
     * Requested position for this member in the video layout.
     * May differ from currentPosition during layout transitions.
     */
    requestedPosition?: string

    // Media Status
    /**
     * Whether this member's audio is currently muted.
     * True when audio is muted, false when unmuted.
     */
    audioMuted: boolean

    /**
     * Whether this member's video is currently muted.
     * True when video is muted/off, false when video is on.
     */
    videoMuted: boolean

    /**
     * Whether this member is currently talking.
     * Based on audio level detection and voice activity.
     */
    talking: boolean

    /**
     * Whether this member's video is visible in the layout.
     * Can be false even if videoMuted is false (e.g., layout positioning).
     */
    visible: boolean

    /**
     * Whether this member is deaf (cannot hear audio).
     * When true, member cannot hear other participants.
     */
    deaf: boolean

    // Status Flags
    /**
     * Whether this member has their hand raised.
     * Used for requesting attention or permission to speak.
     */
    handraised: boolean

    // Audio Controls
    /**
     * Input volume level for this member's microphone.
     * Controls how loud this member's audio is captured.
     */
    inputVolume: number

    /**
     * Output volume level for this member's speakers.
     * Controls how loud other participants sound to this member.
     */
    outputVolume: number

    /**
     * Input sensitivity for this member's microphone.
     * Controls the threshold for voice activity detection.
     */
    inputSensitivity: number

    // Metadata
    /**
     * Custom metadata associated with this member.
     * Application-specific data that can be attached to members.
     */
    meta: Record<string, any>

    /**
     * Subscriber-specific data for this member.
     * Contains subscription and billing-related information.
     */
    subscriberData: Record<string, any>
  }
>

/**
 * Capabilities available to a call session.
 * Defines what actions this participant can perform in the call.
 * 
 * @public
 */
export type CallCapabilities = Prettify<CallCapabilitiesContract>

/**
 * Layout information for video calls.
 * Contains positioning and layout details for participant video streams.
 * 
 * @public
 */
export type CallLayout = Prettify<{
  /**
   * Name/identifier of the current layout.
   * Examples: "grid-responsive", "1x1", "2x2", "3x3", etc.
   */
  name: string

  /**
   * Unique identifier for this layout instance.
   */
  id: string

  /**
   * Array of video layers defining participant positions.
   * Each layer represents a participant's video position and size.
   */
  layers: CallLayoutLayer[]
}>

/**
 * Individual layer in a video call layout.
 * Defines the position, size, and properties of a participant's video.
 * 
 * @public
 */
export type CallLayoutLayer = Prettify<{
  /**
   * Member ID this layer belongs to.
   */
  memberId: string

  /**
   * Layout position identifier (e.g., "1", "2", "3").
   */
  position: string

  /**
   * Whether this layer is currently visible.
   */
  visible: boolean

  /**
   * X coordinate position in pixels.
   */
  x: number

  /**
   * Y coordinate position in pixels.
   */
  y: number

  /**
   * Z-index for layer ordering (higher = front).
   */
  z: number

  /**
   * Width of the video layer in pixels.
   */
  width: number

  /**
   * Height of the video layer in pixels.
   */
  height: number

  /**
   * Reserved member ID for this layer.
   */
  reservation?: string
}>