import {
  BaseComponentOptions,
  connect,
  EventTransform,
  extendComponent,
  InternalVideoMemberEventNames,
  INTERNAL_MEMBER_UPDATED_EVENTS,
  Rooms,
  toExternalJSON,
  toLocalEvent,
  VideoMemberEventParams,
  InternalVideoRoomSessionEventNames,
  VideoRoomUpdatedEventParams,
  VideoRoomSubscribedEventParams,
  InternalVideoLayoutEventNames,
  InternalVideoRecordingEventNames,
  InternalVideoPlaybackEventNames,
  VideoPlaybackEventParams,
  VideoLayoutChangedEventParams,
  VideoRoomSessionContract,
  VideoRoomSessionMethods,
  ConsumerContract,
  EntityUpdated,
  VideoMemberEntity,
  AssertSameType,
  BaseConsumer,
  EventEmitter,
  VideoPosition,
  VideoPositions,
  MemberPosition,
} from '@signalwire/core'
import { RealTimeRoomApiEvents } from '../types'
import { debounce } from '../utils/debounce'
import {
  createRoomSessionMemberObject,
  RoomSessionMember,
} from './RoomSessionMember'
import { memberPositionWorker } from './memberPosition/workers'

type EmitterTransformsEvents =
  | InternalVideoRoomSessionEventNames
  | InternalVideoMemberEventNames
  | InternalVideoLayoutEventNames
  | InternalVideoRecordingEventNames
  | 'video.__local__.recording.start'
  | InternalVideoPlaybackEventNames
  | 'video.__local__.playback.start'

interface RoomSessionMain
  extends VideoRoomSessionContract,
    ConsumerContract<RealTimeRoomApiEvents, RoomSessionFullState> {}

interface RoomSessionDocs extends RoomSessionMain {
  /**
   * Puts the microphone of a given member on mute. The other participants
   * will not hear audio from the muted participant anymore.
   * @param params
   * @param params.memberId id of the member to mute
   *
   * @example
   * ```typescript
   * const id = 'de550c0c-3fac-4efd-b06f-b5b8614b8966'  // you can get this from getMembers()
   * await roomSession.audioMute({memberId: id})
   * ```
   */
  audioMute(params: { memberId: string }): Promise<void>

  /**
   * Unmutes the microphone of a given member if it had been previously muted.
   * @param params
   * @param params.memberId id of the member to unmute
   *
   * @example
   * ```typescript
   * const id = 'de550c0c-3fac-4efd-b06f-b5b8614b8966'  // you can get this from getMembers()
   * await roomSession.audioUnmute({memberId: id})
   * ```
   */
  audioUnmute(params: { memberId: string }): Promise<void>

  /**
   * Puts the video of a given member on mute. Participants will see a mute
   * image instead of the video stream.
   * @param params
   * @param params.memberId id of the member to mute
   *
   * @example
   * ```typescript
   * const id = 'de550c0c-3fac-4efd-b06f-b5b8614b8966'  // you can get this from getMembers()
   * await roomSession.videoMute({memberId: id})
   * ```
   */
  videoMute(params: { memberId: string }): Promise<void>

  /**
   * Unmutes the video of a given member if it had been previously muted.
   * Participants will start seeing the video stream again.
   * @param params
   * @param params.memberId id of the member to unmute
   *
   * @example
   * ```typescript
   * const id = 'de550c0c-3fac-4efd-b06f-b5b8614b8966'  // you can get this from getMembers()
   * await roomSession.videoUnmute({memberId: id})
   * ```
   */
  videoUnmute(params: { memberId: string }): Promise<void>

  /**
   * @deprecated Use {@link setInputVolume} instead.
   * `setMicrophoneVolume` will be removed in v4.0.0
   */
  setMicrophoneVolume(params: {
    memberId: string
    volume: number
  }): Promise<void>

  /**
   * Sets the input volume for a given member (e.g., the microphone input
   * level).
   *
   * @param params
   * @param params.memberId id of the member to affect
   * @param params.volume desired volume. Values range from -50 to 50, with a
   * default of 0.
   *
   * @example
   * ```typescript
   * const id = 'de550c0c-3fac-4efd-b06f-b5b8614b8966'  // you can get this from getMembers()
   * await roomSession.setInputVolume({memberId: id, volume: -10})
   * ```
   */
  setInputVolume(params: { memberId: string; volume: number }): Promise<void>

  /**
   * Sets the input level at which the participant is identified as currently
   * speaking.
   * @param params
   * @param params.memberId id of the member to affect
   * @param params.value desired sensitivity. The default value is 30 and the
   * scale goes from 0 (lowest sensitivity, essentially muted) to 100 (highest
   * sensitivity).
   *
   * @example
   * ```typescript
   * const id = 'de550c0c-3fac-4efd-b06f-b5b8614b8966'  // you can get this from getMembers()
   * await roomSession.setInputSensitivity({memberId: id, value: 80})
   * ```
   */
  setInputSensitivity(params: {
    memberId: string
    value: number
  }): Promise<void>

  /**
   * Returns a list of members currently in the room.
   *
   * @returns an object with type: Promise<{members: {@link VideoMember}[]}>
   *
   * @example
   * ```typescript
   * await roomSession.getMembers()
   * // returns:
   * {
   * "members": [
   *     {
   *          "visible": true,
   *          "room_session_id": "fde15619-13c1-4cb5-899d-96afaca2c52a",
   *          "input_volume": 0,
   *          "id": "1bf4d4fb-a3e4-4d46-80a8-3ebfdceb2a60",
   *          "input_sensitivity": 50,
   *          "output_volume": 0,
   *          "audio_muted": false,
   *          "on_hold": false,
   *          "name": "Mark",
   *          "deaf": false,
   *          "video_muted": false,
   *          "room_id": "aae25822-892c-4832-b0b3-34aac3a0e8d1",
   *          "type": "member"
   *     },
   *     {
   *          "visible": true,
   *          "room_session_id": "fde15619-13c1-4cb5-899d-96afaca2c52a",
   *          "input_volume": 0,
   *          "id": "e0c5be44-d6c7-438f-8cda-f859a1a0b1e7",
   *          "input_sensitivity": 50,
   *          "output_volume": 0,
   *          "audio_muted": false,
   *          "on_hold": false,
   *          "name": "David",
   *          "deaf": false,
   *          "video_muted": false,
   *          "room_id": "aae25822-892c-4832-b0b3-34aac3a0e8d1",
   *          "type": "member"
   *     }
   * ]
   * }
   * ```
   */
  getMembers(): Promise<{ members: VideoMemberEntity[] }>

  /**
   * Mutes the incoming audio for a given member. The affected participant
   * will not hear audio from the other participants anymore.
   *
   * Note that in addition to making a participant deaf, this will also
   * automatically mute the microphone of the target participant. If you want,
   * you can then manually unmute it by calling {@link audioUnmute}.
   * @param params
   * @param params.memberId id of the member to affect
   *
   * @example
   * ```typescript
   * const id = 'de550c0c-3fac-4efd-b06f-b5b8614b8966'  // you can get this from getMembers()
   * await roomSession.deaf({memberId: id})
   * ```
   */
  deaf(params: { memberId: string }): Promise<void>

  /**
   * Unmutes the incoming audio for a given member. The affected participant
   * will start hearing audio from the other participants again.
   *
   * Note that in addition to allowing a participants to hear the others, this
   * will also automatically unmute the microphone of the target participant.
   * If you want, you can then manually mute it by calling {@link audioMute}.
   * @param params
   * @param params.memberId id of the member to affect
   *
   * @example
   * ```typescript
   * const id = 'de550c0c-3fac-4efd-b06f-b5b8614b8966'  // you can get this from getMembers()
   * await roomSession.undeaf({memberId: id})
   * ```
   */
  undeaf(params: { memberId: string }): Promise<void>

  /**
   * @deprecated Use {@link setOutputVolume} instead.
   * `setSpeakerVolume` will be removed in v4.0.0
   */
  setSpeakerVolume(params: { memberId: string; volume: number }): Promise<void>

  /**
   * Sets the output volume for the member (e.g., the speaker output level).
   * @param params
   * @param params.memberId id of the member to affect
   * @param params.volume desired volume. Values range from -50 to 50, with a
   * default of 0.
   *
   * @example
   * ```typescript
   * const id = 'de550c0c-3fac-4efd-b06f-b5b8614b8966'  // you can get this from getMembers()
   * await roomSession.setOutputVolume({memberId: id, volume: -10})
   * ```
   */
  setOutputVolume(params: { memberId: string; volume: number }): Promise<void>

  /**
   * Removes a specific participant from the room.
   * @param params
   * @param params.memberId id of the member to remove
   *
   * @example
   * ```typescript
   * const id = 'de550c0c-3fac-4efd-b06f-b5b8614b8966'  // you can get this from getMembers()
   * await roomSession.removeMember({memberId: id})
   * ```
   */
  removeMember(params: { memberId: string }): Promise<void>

  /**
   * Show or hide muted videos in the room layout. Members that have been muted
   * via {@link videoMute} will display a mute image instead of the video, if
   * this setting is enabled.
   *
   * @param value whether to show muted videos in the room layout.
   *
   * @example
   * ```typescript
   * await roomSession.setHideVideoMuted(false)
   * ```
   */
  setHideVideoMuted(value: boolean): Rooms.SetHideVideoMuted

  /**
   * Returns a list of available layouts for the room. To set a room layout,
   * use {@link setLayout}.
   *
   * @example
   * ```typescript
   * await roomSession.getLayouts()
   * // returns:
   * {
   *   "layouts": [
   *     "8x8", "2x1", "1x1", "5up", "5x5",
   *     "4x4", "10x10", "2x2", "6x6", "3x3",
   *     "grid-responsive", "highlight-1-responsive"
   *   ]
   * }
   * ```
   */
  getLayouts(): Promise<{ layouts: string[] }>

  /**
   * Sets a layout for the room. You can obtain a list of available layouts
   * with {@link getLayouts}.
   *
   * @example Set the 6x6 layout:
   * ```typescript
   * await roomSession.setLayout({name: "6x6"})
   * ```
   */
  setLayout(params: {
    /** Name of the layout */
    name: string
    /** Positions to assign as soon as the new layout is set. */
    positions?: VideoPositions
  }): Rooms.SetLayout

  /**
   * Assigns a position in the layout for multiple members.
   *
   * @example
   * ```js
   * await roomSession.setPositions({
   *   positions: {
   *     "1bf4d4fb-a3e4-4d46-80a8-3ebfdceb2a60": "reserved-1",
   *     "e0c5be44-d6c7-438f-8cda-f859a1a0b1e7": "auto"
   *   }
   * })
   * ```
   */
  setPositions(params: {
    /** Mapping of member IDs and positions to assign */
    positions: VideoPositions
  }): Promise<void>

  /**
   * Assigns a position in the layout to the specified member.
   * 
   * @example
   * ```js
   * await roomSession.setMemberPosition({
   *   memberId: "1bf4d4fb-a3e4-4d46-80a8-3ebfdceb2a60",
   *   position: "off-canvas"
   * })
   * ```
   */
  setMemberPosition(params: {
    /** Id of the member to affect. */
    memberId: string
    /** Position to assign in the layout. */
    position: VideoPosition
  }): Promise<void>

  /**
   * Obtains a list of recordings for the current room session.
   *
   * @example
   * ```js
   * const rec = await roomSession.getRecordings()
   * rec.recordings[0].id
   * rec.recordings[0].state
   * ```
   *
   * @returns The returned objects contain all the properties of a
   * {@link RoomSessionRecording}, but no methods.
   */
  getRecordings(): Rooms.GetRecordings

  /**
   * Starts the recording of the room. You can use the returned
   * {@link RoomSessionRecording} object to control the recording (e.g., pause,
   * resume, stop).
   *
   * @example
   * ```typescript
   * const rec = await roomSession.startRecording()
   * await rec.stop()
   * ```
   */
  startRecording(): Promise<Rooms.RoomSessionRecording>

  /**
   * Obtains a list of playbacks for the current room session.
   *
   * @example
   * ```js
   * const pl = await roomSession.startRecording()
   * pl.playbacks[0].id
   * pl.playbacks[0].state
   * ```
   *
   * @returns The returned objects contain all the properties of a
   * {@link RoomSessionPlayback}, but no methods.
   */
  getPlaybacks(): Rooms.GetPlaybacks

  /**
   * Starts a playback in the room. You can use the returned
   * {@link RoomSessionPlayback} object to control the playback (e.g., pause,
   * resume, setVolume and stop).
   *
   * @example
   * ```typescript
   * const playback = await roomSession.play({ url: 'rtmp://example.com/foo' })
   * await playback.stop()
   * ```
   */
  play(params: {
    /** The url (http, https, rtmp, rtmps) of the stream to reproduce. */
    url: string
    /**
     * The audio volume at which to play the stream. Values range from -50 to
     * 50, with a default of 0.
     */
    volume?: number
    /**
     * Positions to assign as soon as the playback starts. You can use the
     * special keywork `self` to refer to the id of the playback.
     */
    positions?: VideoPositions
  }): Promise<Rooms.RoomSessionPlayback>

  /**
   * Assigns custom metadata to the RoomSession. You can use this to store
   * metadata whose meaning is entirely defined by your application.
   *
   * Note that calling this method overwrites any metadata that had been
   * previously set on this RoomSession.
   *
   * @param meta The metadata object to assign to the RoomSession.
   *
   * @example
   * ```js
   * await roomSession.setMeta({ foo: 'bar' })
   * ```
   */
  setMeta(meta: Record<string, unknown>): Rooms.SetMeta

  /**
   * Assigns custom metadata to the specified RoomSession member. You can use
   * this to store metadata whose meaning is entirely defined by your
   * application.
   *
   * Note that calling this method overwrites any metadata that had been
   * previously set on the specified member.
   *
   * @param params.memberId Id of the member to affect.
   * @param params.meta The medatada object to assign to the member.
   *
   * @example
   * Setting metadata for a member:
   * ```js
   * await roomSession.setMemberMeta({
   *   memberId: 'de550c0c-3fac-4efd-b06f-b5b8614b8966'  // you can get this from getMembers()
   *   meta: {
   *     email: 'joe@example.com'
   *   }
   * })
   * ```
   */
  setMemberMeta(params: {
    memberId: string
    meta: Record<string, unknown>
  }): Rooms.SetMemberMeta

  /**
   * Listens for the events for which you have provided event handlers and
   * returns the {@link RoomSessionFullState} that contains the full state of
   * the room session.
   *
   * Note that you don't need to manually call this method to start listening
   * to events, since they are listened automatically.
   *
   * @example
   * ```typescript
   * const client = ...  // get a client with createClient()
   *
   * client.video.on('room.started', async (roomSession) => {
   *   // attach event listeners...
   *   // roomSession.on(...)
   *
   *   // This gives you the full state of the room session!
   *   const roomSessionState = await roomSession.subscribe()
   *   console.log('room name:', roomSessionState.name)
   *   console.log('members:', roomSessionState.members)
   * }
   * ```
   */
  subscribe(): Promise<RoomSessionFullState>
}

/**
 * Represents a room session. You can obtain instances of this class by
 * subscribing to the appropriate events from {@link Video}.
 *
 * ### Events
 * You can use this object to subscribe to the following events.
 *
 * #### Room events:
 *
 *  - **room.started**,
 *  - **room.updated**,
 *  - **room.ended**:
 *
 * Emitted when the room session is, respectively, started, updated, or ended.
 * Your event handler receives an object which is an instance of
 * {@link RoomSession}.
 *
 *  - **recording.started**,
 *  - **recording.updated**,
 *  - **recording.ended**:
 *
 * Emitted when a recording is, respectively, started, updated, or ended. Your
 * event handler receives an object which is an instance of
 * {@link RoomSessionRecording}.
 *
 *  - **playback.started**,
 *  - **playback.updated**,
 *  - **playback.ended**:
 *
 * Emitted when a playback is, respectively, started, updated, or ended. Your
 * event handler receives an object which is an instance of
 * {@link RoomSessionPlayback}.
 *
 *  - **layout.changed**:
 *
 * Emitted when the layout of the room changes.
 *
 * #### Member events:
 *
 *  - **member.joined**:
 *
 * Emitted when a member joins the room. Your event handler receives an object
 * of type {@link RoomSessionMember}.
 *
 *  - **member.left**:
 *
 * Emitted when a member leaves the room. Your event handler receives an object
 * of type {@link RoomSessionMember}.
 *
 *  - **member.talking**:
 *
 * Emitted when a member starts or stops talking. Your event handler receives an
 * object of type {@link RoomSessionMember}.
 *
 *  - **member.talking.started**:
 *
 * Emitted when a member starts talking. Your event handler receives an object
 * of type {@link RoomSessionMember}.
 *
 *  - **member.talking.ended**:
 *
 * Emitted when a member stops talking. Your event handler receives an object of
 * type {@link RoomSessionMember}.
 *
 *  - **member.updated**:
 *
 * Emitted when any property of one of the members is updated. Your event
 * handler receives an object `member` of type {@link RoomSessionMember}. Use
 * `member.updated` to access the list of updated properties. Example:
 * ```typescript
 * room.on('member.updated', (member) => {
 *     console.log(member.updated)
 *     // [ 'audioMuted' ]
 * }
 * ```
 *
 *  - **member.updated.audioMuted**,
 *  - **member.updated.videoMuted**,
 *  - **member.updated.deaf**,
 *  - **member.updated.onHold**,
 *  - **member.updated.visible**,
 *  - **member.updated.inputVolume**,
 *  - **member.updated.outputVolume**,
 *  - **member.updated.inputSensitivity**:
 *
 * Each of the above events is emitted when the associated property changes.
 * Your event handler receives an object `member` of type
 * {@link RoomSessionMember}.
 *
 */
export interface RoomSession
  extends AssertSameType<RoomSessionMain, RoomSessionDocs> {}

export type RoomSessionUpdated = EntityUpdated<RoomSession>
export interface RoomSessionFullState extends RoomSession {
  /** List of members that are part of this room session */
  members: RoomSessionMember[]
}

class RoomSessionConsumer extends BaseConsumer<RealTimeRoomApiEvents> {
  protected _eventsPrefix = 'video' as const

  /** @internal */
  protected subscribeParams = {
    get_initial_state: true,
  }

  /** @internal */
  private debouncedSubscribe: ReturnType<typeof debounce>

  constructor(options: BaseComponentOptions<RealTimeRoomApiEvents>) {
    super(options)

    this.debouncedSubscribe = debounce(this.subscribe, 100)
    this.setWorker('memberPositionWorker', {
      worker: memberPositionWorker,
    })
    this.attachWorkers()
  }

  /** @internal */
  protected _internal_on(
    event: keyof RealTimeRoomApiEvents,
    fn: EventEmitter.EventListener<RealTimeRoomApiEvents, any>
  ) {
    return super.on(event, fn)
  }

  on(
    event: keyof RealTimeRoomApiEvents,
    fn: EventEmitter.EventListener<RealTimeRoomApiEvents, any>
  ) {
    const instance = super.on(event, fn)
    this.debouncedSubscribe()
    return instance
  }

  once(
    event: keyof RealTimeRoomApiEvents,
    fn: EventEmitter.EventListener<RealTimeRoomApiEvents, any>
  ) {
    const instance = super.once(event, fn)
    this.debouncedSubscribe()
    return instance
  }

  /**
   * @privateRemarks
   *
   * Override BaseConsumer `subscribe` to resolve the promise when the 'room.subscribed'
   * event comes. This way we can return to the user the room full state.
   * Note: the payload will go through an EventTrasform - see the `type: roomSessionSubscribed`
   * below.
   */
  subscribe() {
    return new Promise(async (resolve, reject) => {
      const handler = (payload: RoomSessionFullState) => {
        resolve(payload)
      }
      try {
        /**
         * Note that we're using `super.once` (instead of
         * `this.once`) here, because we don't want to
         * re-trigger our added custom behavior.
         */
        super.once('room.subscribed', handler)
        await super.subscribe()
      } catch (error) {
        super.off('room.subscribed', handler)
        return reject(error)
      }
    })
  }

  /** @internal */
  protected override getCompoundEvents() {
    return new Map<any, any>([...MemberPosition.MEMBER_POSITION_COMPOUND_EVENTS])
  }

  /** @internal */
  protected getEmitterTransforms() {
    return new Map<
      EmitterTransformsEvents | EmitterTransformsEvents[],
      EventTransform
    >([
      [
        'video.room.subscribed',
        {
          type: 'roomSessionSubscribed',
          instanceFactory: () => {
            return this
          },
          payloadTransform: (payload: VideoRoomSubscribedEventParams) => {
            return toExternalJSON(payload.room_session)
          },
          getInstanceEventNamespace: (
            payload: VideoRoomSubscribedEventParams
          ) => {
            return payload.room_session.id
          },
          getInstanceEventChannel: (
            payload: VideoRoomSubscribedEventParams
          ) => {
            return payload.room_session.event_channel
          },
        },
      ],
      [
        'video.room.updated',
        {
          type: 'roomSession',
          instanceFactory: () => {
            return this
          },
          payloadTransform: (payload: VideoRoomUpdatedEventParams) => {
            return toExternalJSON({
              ...payload.room_session,
              room_session_id: payload.room_session.id,
            })
          },
          getInstanceEventNamespace: (payload: VideoRoomUpdatedEventParams) => {
            return payload.room_session.id
          },
          getInstanceEventChannel: (payload: VideoRoomUpdatedEventParams) => {
            return payload.room_session.event_channel
          },
        },
      ],
      [
        'video.layout.changed',
        {
          type: 'roomSessionLayout',
          instanceFactory: () => {
            // TODO: Implement a Layout object when we have a better payload
            // from the backend
            return {}
          },
          payloadTransform: (payload: VideoLayoutChangedEventParams) => {
            return toExternalJSON(payload.layout)
          },
        },
      ],
      [
        [
          'video.member.joined',
          'video.member.left',
          'video.member.talking',
          'video.member.talking.start',
          'video.member.talking.started',
          'video.member.talking.stop',
          'video.member.talking.ended',
          'video.member.updated',
          ...INTERNAL_MEMBER_UPDATED_EVENTS,
        ],
        {
          type: 'roomSessionMember',
          instanceFactory: (_payload: VideoMemberEventParams) => {
            return createRoomSessionMemberObject({
              store: this.store,
              // TODO: the emitter is now typed so types
              // don't match but internally it doesn't
              // matter that much.
              // @ts-expect-error
              emitter: this.options.emitter,
            })
          },
          payloadTransform: (payload: VideoMemberEventParams) => {
            return toExternalJSON({
              ...payload.member,
              /**
               * The server is sending the member id as `id`
               * but internally (i.e in CustomMethods) we
               * reference it as `memberId`. This is needed
               * because sometimes we have to deal with
               * multiple ids at once and having them
               * properly prefixed makes it easier to read.
               */
              member_id: payload.member.id,
            })
          },
        },
      ],
      [
        [
          toLocalEvent<EmitterTransformsEvents>('video.recording.start'),
          'video.recording.started',
          'video.recording.updated',
          'video.recording.ended',
        ],
        {
          type: 'roomSessionRecording',
          instanceFactory: (_payload: any) => {
            return Rooms.createRoomSessionRecordingObject({
              store: this.store,
              // @ts-expect-error
              emitter: this.emitter,
            })
          },
          payloadTransform: (payload: any) => {
            return toExternalJSON({
              ...payload.recording,
              room_session_id: payload.room_session_id,
            })
          },
        },
      ],
      [
        [
          toLocalEvent<EmitterTransformsEvents>('video.playback.start'),
          'video.playback.started',
          'video.playback.updated',
          'video.playback.ended',
        ],
        {
          type: 'roomSessionPlayback',
          instanceFactory: (_payload: any) => {
            return Rooms.createRoomSessionPlaybackObject({
              store: this.store,
              // @ts-expect-error
              emitter: this.emitter,
            })
          },
          payloadTransform: (payload: VideoPlaybackEventParams) => {
            return toExternalJSON({
              ...payload.playback,
              room_session_id: payload.room_session_id,
            })
          },
        },
      ],
    ])
  }
}

export const RoomSessionAPI = extendComponent<
  RoomSessionConsumer,
  VideoRoomSessionMethods
>(RoomSessionConsumer, {
  videoMute: Rooms.videoMuteMember,
  videoUnmute: Rooms.videoUnmuteMember,
  getMembers: Rooms.getMembers,
  audioMute: Rooms.audioMuteMember,
  audioUnmute: Rooms.audioUnmuteMember,
  deaf: Rooms.deafMember,
  undeaf: Rooms.undeafMember,
  setInputVolume: Rooms.setInputVolumeMember,
  setOutputVolume: Rooms.setOutputVolumeMember,
  setMicrophoneVolume: Rooms.setInputVolumeMember,
  setSpeakerVolume: Rooms.setOutputVolumeMember,
  setInputSensitivity: Rooms.setInputSensitivityMember,
  removeMember: Rooms.removeMember,
  setHideVideoMuted: Rooms.setHideVideoMuted,
  getLayouts: Rooms.getLayouts,
  setLayout: Rooms.setLayout,
  setPositions: Rooms.setPositions,
  setMemberPosition: Rooms.setMemberPosition,
  getRecordings: Rooms.getRecordings,
  startRecording: Rooms.startRecording,
  getPlaybacks: Rooms.getPlaybacks,
  play: Rooms.play,
  setMeta: Rooms.setMeta,
  setMemberMeta: Rooms.setMemberMeta,
})

export const createRoomSessionObject = (
  params: BaseComponentOptions<EmitterTransformsEvents>
): RoomSession => {
  const roomSession = connect<
    RealTimeRoomApiEvents,
    RoomSessionConsumer,
    RoomSession
  >({
    store: params.store,
    Component: RoomSessionAPI,
    componentListeners: {
      errors: 'onError',
      responses: 'onSuccess',
    },
  })(params)

  return roomSession
}
