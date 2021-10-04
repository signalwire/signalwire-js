import { BaseRoomSession } from './BaseRoomSession'
import { RoomSessionDevice } from './RoomSessionDevice';
import { RoomSessionScreenShare } from './RoomSessionScreenShare';

export interface RoomSessionDocs<T> extends BaseRoomSession<T>  {

  /** Whether the connection is currently active */
  get active(): boolean
  
  /** The id of the video device, or null if not available */
  get cameraId(): string
  
  /** The label of the video device, or null if not available */
  get cameraLabel(): string
  
  /**
   * Contains any additional devices added via {@link addCamera},
   * {@link addMicrophone}, or {@link addDevice}.
   */
  get deviceList(): RoomSessionDevice[]
  
  /**
   * Provides access to the local audio
   * [MediaStreamTrack](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack).
   */
  get localAudioTrack(): MediaStreamTrack
  
  /** Provides access to the local [MediaStream](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream) */
  get localStream(): MediaStream
  
  /**
   * Provides access to the local video
   * [MediaStreamTrack](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack).
   */
  get localVideoTrack(): MediaStreamTrack
  
  /** The id of the current member within the room */
  get memberId(): string
  
  /** The id of the audio input device, or null if not available */
  get microphoneId(): string
  
  /** The label of the audio input device, or null if not available */
  get microphoneLabel(): string
  
  /**
   * Provides access to the remote [MediaStream](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream)
   */
  get remoteStream(): MediaStream
  
  /** The unique identifier for the room */
  get roomId(): string
  
  /** The unique identifier for the room session */
  get roomSessionId(): string

  /** Contains any local screen shares added to the room via {@link createScreenShareObject}. */
  get screenShareList(): RoomSessionScreenShare[]
  
  /** Whether the connection is currently in the "trying" state. */
  get trying(): boolean
  
  /** @internal */
  restoreOutboundAudio: any
  /** @internal */
  restoreOutboundVideo: any
  /** @internal */
  stopOutboundAudio: any
  /** @internal */
  stopOutboundVideo: any

  /**
   * Creates a new RoomSession.
   */
  new(opts: {
    /** SignalWire project id, e.g. `a10d8a9f-2166-4e82-56ff-118bc3a4840f` */
    project?: string
    /** SignalWire project token, e.g. `PT9e5660c101cd140a1c93a0197640a369cf5f16975a0079c9` */
    token: string
    /** logging level */
    logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent'
    /** HTML element in which to display the video stream */
    rootElement?: HTMLElement
    /** Whether to apply the local-overlay on top of your video. Default: `true`. */
    applyLocalVideoOverlay?: boolean
    /** Whether to stop the camera when the member is muted. Default: `true`. */
    stopCameraWhileMuted?: boolean
    /** Whether to stop the microphone when the member is muted. Default: `true`. */
    stopMicrophoneWhileMuted?: boolean
    /** List of ICE servers. */
    iceServers?: RTCIceServer[]
    /** Audio constraints to use when joining the room. Default: `true`. */
    audio?: MediaStreamConstraints['audio']
    /** Video constraints to use when joining the room. Default: `true`. */
    video?: MediaStreamConstraints['video']
    /** Id of the speaker device to use for audio output. If undefined, picks a default speaker. */
    speakerId?: string
  }): T

  /**
   * Joins the room session.
   */
  join(): Promise<T>

  /**
   * Leaves the room. This detaches all the locally originating streams from the
   * room.
   */
  leave(): Promise<void>

  /**
   * Adds a screen sharing instance to the room. You can create multiple screen
   * sharing instances and add all of them to the room.
   * @param opts 
   * 
   * @example Sharing the screen together with the associated audio:
   * ```typescript
   * await roomSession.createScreenShareObject({audio: true, video: true})
   * ```
   */
  createScreenShareObject(opts: {
    /** Whether the screen share object should automatically join the room */
    autoJoin?: boolean
    /** Audio constraints to use when joining the room. Default: `true`. */
    audio?: MediaStreamConstraints['audio']
    /** Video constraints to use when joining the room. Default: `true`. */
    video?: MediaStreamConstraints['video']
  }): Promise<RoomSessionScreenShare>

  /**
   * Adds a camera device to the room. Using this method, a user can stream
   * multiple video sources at the same time.
   *
   * @param opts Specify the constraints for the device. In addition, you can
   * add the autoJoin key to specify whether the device should immediately join
   * the room or joining will be performed manually later.
   *
   * @example Adding any of the camera devices to the room (duplicate streams
   * are possible):
   * ```typescript
   * await roomSession.addCamera()
   * ```
   * 
   * @example Adding a specific camera:
   * ```typescript
   * await roomSession.addCamera({deviceId: "gOtMHwZdoA6wMlAnhbfTmeRgPAsqa7iw1OwgKYtbTLA="})
   * ```
   * 
   * @example Adding a high-resolution camera, joining it manually:
   * ```typescript
   * const roomDev = await roomSession.addCamera({
   *   autoJoin: false,
   *   width: {min: 1280}
   * })
   * await roomDev.join()
   * ```
   */
  addCamera(opts: MediaTrackConstraints & {
    /** Whether the device should automatically join the room. Default: `true`. */
    autoJoin?: boolean
  }): Promise<RoomSessionDevice>

  /**
   * Adds a microphone device to the room. Using this method, a user can stream
   * multiple video sources at the same time.
   *
   * @param opts Specify the constraints for the device. In addition, you can
   * add the autoJoin key to specify whether the device should immediately join
   * the room or joining will be performed manually later.
   *
   * @example Adding any of the microphone devices to the room (duplicate
   * streams are possible):
   * ```typescript
   * await roomSession.addMicrophone()
   * ```
   *
   * @example Adding a specific microphone:
   * ```typescript
   * await roomSession.addMicrophone({deviceId: "PIn/IIDDgBUHzJkhRncv1m85hX1gC67xYIgJvvThB3Q="})
   * ```
   *
   * @example Adding a microphone with specific constraints, joining it manually:
   * ```typescript
   * const roomDev = await roomSession.addMicrophone({
   *   autoJoin: false,
   *   noiseSuppression: true
   * })
   * await roomDev.join()
   * ```
   */
  addMicrophone(opts: MediaTrackConstraints & {
    /** Whether the device should automatically join the room. Default: `true`. */
    autoJoin?: boolean
  }): Promise<RoomSessionDevice>

  /**
   * Adds a device to the room. Using this method, a user can stream multiple
   * sources at the same time. If you need to add a camera device or a
   * microphone device, you can alternatively use the more specific methods
   * {@link addCamera} and {@link addMicrophone}.
   *
   * @param opts Specify the constraints for the device. In addition, you can
   * add the autoJoin key to specify whether the device should immediately join
   * the room or joining will be performed manually later.
   *
   * @example Adding any of the microphone devices to the room (duplicate
   * streams are possible):
   * ```typescript
   * await roomSession.addDevice({audio: true})
   * ```
   */
  addDevice(opts: {
    /** Whether the device should automatically join the room. Default: `true`. */
    autoJoin?: boolean
    /** Audio constraints. */
    audio?: MediaStreamConstraints['audio']
    /** Video constraints. */
    video?: MediaStreamConstraints['video']
  }): Promise<RoomSessionDevice>

  /**
   * Replaces the current speaker with a different one.
   * 
   * > 📘 
   * > Some browsers do not support output device selection. You can check by calling {@link WebRTC.supportsMediaOutput}.
   * 
   * @param opts
   * @param opts.deviceId id of the new speaker device
   * 
   * @example Replaces the current speaker:
   * ```typescript
   * await room.updateSpeaker({deviceId: "/o4ZeWzroh+8q0Ds/CFfmn9XpqaHzmW3L/5ZBC22CRg="})
   * ```
   */
  updateSpeaker(opts: { deviceId: string }): Promise<void>

  /**
   * Replaces the current camera stream with the one coming from a different
   * device.
   * @param constraints Specify the constraints that the device should satisfy.
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
   * @param constraints Specify the constraints that the device should satisfy.
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
   * Destroys the room object. This only destroys the JavaScript object: it has
   * no effect on the server-side room.
   */
  destroy(): void
  
  /** @ignore */
  setMicrophoneVolume(params: any): any

  /** @ignore */
  setSpeakerVolume(params: any): any

  /**
   * The current client joined the room session. The event handler receives
   * objects that contain information about the room and all its members
   * (including the current client). The objects received by the event handler
   * have the following type:
   * 
   * ```typescript
   * type _ = {
   *   room: {
   *     room_session_id: string,
   *     logos_visible: boolean,
   *     members: Array<{
   *       visible: boolean,
   *       room_session_id: string,
   *       input_volume: number,
   *       id: string,
   *       input_sensitivity: number,
   *       output_volume: number,
   *       audio_muted: boolean,
   *       on_hold: boolean,
   *       name: string,
   *       deaf: boolean,
   *       video_muted: boolean,
   *       room_id: string,
   *       type: string
   *     }>,
   *     blind_mode: boolean,
   *     recording: boolean,
   *     silent_mode: boolean,
   *     name: string,
   *     hide_video_muted: boolean,
   *     locked: boolean,
   *     meeting_mode: boolean,
   *     room_id: string,
   *     event_channel: string
   *   },
   *   call_id: string,
   *   member_id: string
   * }
   * ```
   * 
   * @event
   */
   'room.joined': undefined

   /**
    * The properties of the room have been updated. The event handler receives
    * objects of type:
    *
    * ```typescript
    * type _ = {
    *   room_session_id: string,
    *   room_id: string,
    *   room: {
    *     updated: Array<string>,
    *     room_session_id: string,
    *     room_id: string,
    *   }
    * }
    * ```
    *
    * In particular, in the field `room.updated` you find an array of all the
    * properties that have been updated. The new values for those properties are
    * available as additional fields of `room`.
    *
    * For example, say `hide_video_muted` has been updated. The received object
    * will be:
    * ```typescript
    * {
    *   "room_session_id": "fc695445-7f93-4597-b705-c0db6c21096a",
    *   "room_id": "aae25822-892c-4832-b0b3-34aac3a0e8d1",
    *   "room": {
    *     "updated": [ "hide_video_muted" ],
    *     "room_session_id": "fc695445-7f93-4597-b705-c0db6c21096a",
    *     "room_id": "aae25822-892c-4832-b0b3-34aac3a0e8d1",
    *     "hide_video_muted": true
    *   }
    * }
    * ```
    *
    * @event
    */
   'room.updated': undefined

   /**
    * A member has joined the room. The event handler receives objects of type:
    * 
    * ```typescript
    * type _ = {
    *   room_session_id: string,
    *   room_id: string,
    *   member: {
    *     visible: boolean,
    *     room_session_id: string,
    *     input_volume: number,
    *     id: string,
    *     scope_id: string,
    *     input_sensitivity: number,
    *     output_volume: number,
    *     audio_muted: boolean,
    *     on_hold: boolean,
    *     name: string,
    *     deaf: boolean,
    *     video_muted: boolean,
    *     room_id: string,
    *     type: string
    *   }
    * }
    * ```
    * 
    * @event
    */
   'member.joined': undefined

   /**
    * A property of a member of the room has been updated. The event handler
    * receives objects of type:
    *
    * ```typescript
    * type _ = {
    *   room_session_id: string,
    *   room_id: string,
    *   member: {
    *     updated: Array<string>,
    *     room_session_id: string,
    *     id: string,
    *     room_id: string,
    *     type: string
    *   }
    * }
    * ```
    *
    * In particular, in the field `member.updated` you find an array of all the
    * properties that have been updated. The new values for those properties are
    * available as additional fields of member.
    *
    * For example, say `visible` and `video_muted` have been updated. The
    * received object will be:
    * 
    * ```typescript
    * {
    *   "room_session_id": "35e85417-09cf-4b07-8f21-d3c16809e5a8",
    *   "room_id": "aae25822-892c-4832-b0b3-34aac3a0e8d1",
    *   "member": {
    *     "updated": ["visible", "video_muted"],
    *     "room_session_id": "35e85417-09cf-4b07-8f21-d3c16809e5a8",
    *     "visible": false,
    *     "video_muted": true,
    *     "id": "4a829c9f-812c-49d7-b272-e3077213c55e",
    *     "room_id": "aae25822-892c-4832-b0b3-34aac3a0e8d1",
    *     "type": "member"
    *   }
    * }
    * ```  
    *
    * @event
    */
   'member.updated': undefined

   /**
    * A member has left the room. The event handler receives objects of type:
    * 
    * ```typescript
    * type _ = {
    *   room_session_id: string,
    *   room_id: string,
    *   member: {
    *     room_session_id: string,
    *     id: string,
    *     room_id: string,
    *     type: string
    *   }
    * }
    * ```
    * 
    * @event
    */
   'member.left': undefined

   /**
    * A member is talking or has stopped talking. The event handler receives
    * objects of type:
    * 
    * ```typescript
    * type _ = {
    *   room_session_id: string,
    *   room_id: string,
    *   member: {
    *     id: string,
    *     room_session_id: string,
    *     room_id: string,
    *     talking: boolean
    *   }
    * }
    * ```
    * 
    * @event
    */
   'member.talking': undefined

   /**
    * The layout of the room has changed. This event is not limited to changes
    * associated to the grid layout of the room: it also includes for example
    * changes in the position of the participants within the grid of the room.
    * The event handler receives objects of type:
    * 
    * ```typescript
    * type _ = {
    *   room_session_id: string,
    *   room_id: string,
    *   layout: {
    *     layers: Array<{
    *       y: number,
    *       x: number,
    *       reservation: string,
    *       layer_index: number,
    *       height: number,
    *       z_index: number,
    *       member_id: string,
    *       width: number
    *     }>,
    *     room_session_id: string,
    *     room_id: string,
    *     name: string
    *   }
    * }
    * ```
    * @event
    */
   'layout.changed': undefined

   /**
    * A recording has been started in the room. You only receive this event if
    * your token has the `room.recording` permission. The event handler receives
    * a {@link RoomSessionRecording} object.
    * 
    * @event
    */
   'recording.started': undefined

   /**
    * An active recording has been updated. You only receive this event if your
    * token has the room.recording permission. The event handler receives a
    * {@link RoomSessionRecording} object.
    * 
    * @event
    */
   'recording.updated': undefined

   /**
    * An active recording has been stopped. You only receive this event if your
    * token has the room.recording permission. The event handler receives a
    * {@link RoomSessionRecording} object.
    * 
    * @event
    */
   'recording.ended': undefined

}
