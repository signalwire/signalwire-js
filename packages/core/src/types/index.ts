import type { EventEmitter } from '../utils/EventEmitter'
import type { VideoAPIEvent } from './video'
import type {
  JSONRPCRequest,
  UpdateMediaParams,
  UpdateMediaDirection,
} from '../utils/interfaces'
import type { VideoManagerEvent } from './cantina'
import type { ChatEvent } from './chat'
import type { TaskEvent } from './task'
import type { MessagingEvent } from './messaging'
import type { VoiceCallEvent } from './voice'
import { FabricEvent, ConversationEvent } from '..'

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

  removeAllListeners<T extends EventEmitter.EventNames<EventTypes>>(
    event?: T
  ): EmitterContract<EventTypes>

  /** @internal */
  emit<E extends EventEmitter.EventNames<EventTypes>>(
    event: E,
    ...args: EventEmitter.EventArgs<EventTypes, E>
  ): void
}

export interface BaseComponentContract {
  /**
   * This only destroys the JavaScript object: it has no
   * effect on the server-side room.
   */
  destroy(): void
}

export interface BaseConnectionContract<
  EventTypes extends EventEmitter.ValidEventTypes
> extends EmitterContract<EventTypes> {
  /** Unique id for this room session */
  readonly id: string
  /** @internal The BaseConnection options  */
  readonly options: Record<any, any>

  /** @internal */
  readonly leaveReason: 'RECONNECTION_ATTEMPT_TIMEOUT' | undefined

  /** The id of the video device, or null if not available */
  readonly cameraId: string | null
  /** The label of the video device, or null if not available */
  readonly cameraLabel: string | null
  /** The constraints applied to the video device, or null if not available */
  readonly cameraConstraints: MediaTrackConstraints | null
  /** Provides access to the local [MediaStream](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream) */
  readonly localStream: MediaStream | undefined
  /** Indicates if there is any receiving audio */
  readonly withAudio: boolean
  /** Indicates if there is any receiving video */
  readonly withVideo: boolean
  /**
   * Provides access to the local audio
   * [MediaStreamTrack](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack).
   */
  readonly localAudioTrack: MediaStreamTrack | null
  /**
   * Provides access to the local video
   * [MediaStreamTrack](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack).
   */
  readonly localVideoTrack: MediaStreamTrack | null
  /** The id of the audio input device, or null if not available */
  readonly microphoneId: string | null
  /** The label of the audio input device, or null if not available */
  readonly microphoneLabel: string | null
  /** The constraints applied to the audio input device, or null if not available */
  readonly microphoneConstraints: MediaTrackConstraints | null
  /**
   * Provides access to the remote [MediaStream](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream)
   */
  readonly remoteStream: MediaStream | undefined
  /** The unique identifier for the room */
  readonly roomId: string
  /** @internal The underlying connection id - callId  */
  readonly callId: string
  /** The unique identifier for the room session */
  readonly roomSessionId: string
  /** Whether the connection is currently active */
  readonly active: boolean
  /** The id of the current member within the room */
  readonly memberId: string
  /** The preview_url for the room. Only with "enable_room_previews: true" on Room configuration. */
  readonly previewUrl?: string

  /**
   * Replaces the current camera stream with the one coming from a different
   * device.
   * @param constraints Specify the constraints that the device should satisfy. {@link MediaTrackConstraints}
   * See
   * [MediaTrackConstraints](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints).
   *
   * @example Replaces the current camera stream with the one coming from the specified deviceId:
   * ```typescript
   * await room.updateCamera({deviceId: "/o4ZeWzroh+8q0Ds/CFfmn9XpqaHzmW3L/5ZBC22CRg="})
   * ```
   */
  updateCamera(constraints: MediaTrackConstraints): Promise<void>
  /**
   * Replaces the current microphone stream with the one coming from a different
   * device.
   * @param constraints Specify the constraints that the device should satisfy. {@link MediaTrackConstraints}
   * See
   * [MediaTrackConstraints](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints).
   *
   * @example Replaces the current microphone stream with the one coming from
   * the specified deviceId:
   * ```typescript
   * await room.updateMicrophone({deviceId: "/o4ZeWzroh+8q0Ds/CFfmn9XpqaHzmW3L/5ZBC22CRg="})
   * ```
   */
  updateMicrophone(constraints: MediaTrackConstraints): Promise<void>

  /**
   * Replaces the current local media stream with the one coming from the user.
   * @param stream Specify the media stream that the device should use.
   * See
   * [MediaStream](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream).
   *
   * @example Replaces the current media stream with the one coming from the user:
   * ```typescript
   * room.setLocalStream(new MediaStream)
   * ```
   */
  setLocalStream(stream: MediaStream): Promise<MediaStream>

  /**
   * Send DTMF
   * @param {string} dtmf
   *
   * @example
   * ```typescript
   * room.sendDigits('1')
   * ```
   */
  sendDigits(dtmf: string): Promise<void>

  /**
   * Upgrade or downgrade the media in the WebRTC connection.
   * It perform RTC Peer renegotiation.
   *
   * @param params - {@link UpdateMediaParams}
   *
   * @returns A Promise that resolves once the requested media is negotiated or failed.
   *
   * @example
   * ```typescript
   * room.updateMedia({ video: { direction: 'sendrecv' } })
   * ```
   */
  updateMedia(params: UpdateMediaParams): Promise<void>

  /**
   * Add or update the audio with requested direction.
   * It perform RTC Peer renegotiation.
   *
   * @param params - {@link UpdateMediaDirection}
   *
   * @returns A Promise that resolves once the requested audio is negotiated or failed.
   *
   * @example
   * ```typescript
   * room.setAudioDirection('sendrecv')
   * ```
   */
  setAudioDirection(direction: UpdateMediaDirection): Promise<void>

  /**
   * Add or update the video with requested direction.
   * It perform RTC Peer renegotiation.
   *
   * @param params - {@link UpdateMediaDirection}
   *
   * @returns A Promise that resolves once the requested video is negotiated or failed.
   *
   * @example
   * ```typescript
   * room.setVideoDirection('recvonly')
   * ```
   */
  setVideoDirection(direction: UpdateMediaDirection): Promise<void>

  /**
   * Hold the call.
   * It stops the self member's outbound video/audio and other member's inbound video/audio.
   *
   * @returns A Promise that resolves once the hold state is acheived.
   *
   * @example
   * ```typescript
   * room.hold()
   * ```
   */
  hold(): Promise<void>

  /**
   * Unhold the call.
   * It resumes the self member's outbound video/audio and other member's inbound video/audio.
   *
   * @returns A Promise that resolves once the active call state is acheived.
   *
   * @example
   * ```typescript
   * room.unhold()
   * ```
   */
  unhold(): Promise<void>

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
  /**
   * Disconnects this client. The client will stop receiving events and you will
   * need to create a new instance if you want to use it again.
   *
   * @example
   *
   * ```js
   * client.disconnect()
   * ```
   */
  disconnect(): void
}

export interface ClientContract<
  ClientInstance,
  EventTypes extends EventEmitter.ValidEventTypes
> extends EmitterContract<EventTypes> {
  /**
   * Connect the underlay WebSocket connection to the SignalWire network.
   *
   * @returns Promise that will resolve with the Client object.
   *
   * @example
   *
   * ```js
   * client.connect()
   * ```
   */
  connect(): Promise<ClientInstance>
  /**
   * Disconnects this client. The client will stop receiving events and you will
   * need to create a new instance if you want to use it again.
   *
   * @example
   *
   * ```js
   * client.disconnect()
   * ```
   */
  disconnect(): void
}

export interface DisconnectableClientContract<
  ClientInstance,
  EventTypes extends EventEmitter.ValidEventTypes
> extends Omit<ClientContract<ClientInstance, EventTypes>, 'connect'> {}

export type WebRTCEventType = 'webrtc.message' // | 'webrtc.verto'
export interface WebRTCMessageParams extends SwEvent {
  event_type: WebRTCEventType
  project_id: string
  node_id: string
  params: JSONRPCRequest
}

export type SwAuthorizationStateEventName = 'signalwire.authorization.state'

export type SwAuthorizationState = string

export interface SwAuthorizationStateEventParams {
  authorization_state: SwAuthorizationState
}

export interface SwAuthorizationStateEvent {
  event_type: SwAuthorizationStateEventName
  params: SwAuthorizationStateEventParams
}

// prettier-ignore
export type SwEventParams =
  | VideoAPIEvent
  | WebRTCMessageParams
  | VideoManagerEvent
  | ChatEvent
  | TaskEvent
  | MessagingEvent
  | VoiceCallEvent
  | SwAuthorizationStateEvent
  | ConversationEvent
  | FabricEvent

export * from './video'
export * from './utils'
export * from './cantina'
export * from './chat'
export * from './common'
export * from './pubSub'
export * from './task'
export * from './messaging'
export * from './voice'
export * from './fabric'
export * from './fabricRoomSession'
export * from './fabricMember'
export * from './fabricLayout'
export * from './conversation'
