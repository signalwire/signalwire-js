import type { Rooms } from '@signalwire/core'
import { BaseRoomSession } from './BaseRoomSession'
import { RoomSessionDevice } from './RoomSessionDevice'
import { RoomSessionScreenShare } from './RoomSessionScreenShare'

export interface RoomSessionDocs<T>
  extends RoomMemberMethodsInterfaceDocs,
    RoomControlMethodsInterfaceDocs,
    RoomLayoutMethodsInterface,
    RoomSessionConstructorDocs<T>,
    Pick<BaseRoomSession<T>, 'on' | 'off' | 'once'> {
  /** @internal */
  stopOutboundAudio(): void
  /** @internal */
  restoreOutboundAudio(): void
  /** @internal */
  stopOutboundVideo(): void
  /** @internal */
  restoreOutboundVideo(): void

  /** Whether the connection is currently active */
  readonly active: boolean

  /** The id of the video device, or null if not available */
  readonly cameraId: string | null

  /** The label of the video device, or null if not available */
  readonly cameraLabel: string | null

  /**
   * Contains any additional devices added via {@link addCamera},
   * {@link addMicrophone}, or {@link addDevice}.
   */
  readonly deviceList: RoomSessionDevice[]

  /**
   * Provides access to the local audio
   * [MediaStreamTrack](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack).
   */
  readonly localAudioTrack: MediaStreamTrack | null

  /** Provides access to the local [MediaStream](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream) */
  readonly localStream: MediaStream | undefined

  /**
   * Provides access to the local video
   * [MediaStreamTrack](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack).
   */
  readonly localVideoTrack: MediaStreamTrack | null

  /** The id of the current member within the room */
  readonly memberId: string

  /** The id of the audio input device, or null if not available */
  readonly microphoneId: string | null

  /** The label of the audio input device, or null if not available */
  readonly microphoneLabel: string | null

  /**
   * Provides access to the remote [MediaStream](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream)
   */
  readonly remoteStream: MediaStream | undefined

  /** The unique identifier for the room */
  readonly roomId: string

  /** The unique identifier for the room session */
  readonly roomSessionId: string

  /** Contains any local screen shares added to the room via {@link startScreenShare}. */
  readonly screenShareList: RoomSessionScreenShare[]

  /**
   * If the Room has been created with the property `enable_room_previews` set
   * to `true`, this field contains the URL to the room preview.
   */
  readonly previewUrl?: string

  /**
   * Joins the room session.
   */
  join(): Promise<this>

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
   * @deprecated Use {@link startScreenShare} instead.
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
   * Adds a screen sharing instance to the room. You can create multiple screen
   * sharing instances and add all of them to the room.
   * @param opts
   *
   * @example Sharing the screen together with the associated audio:
   * ```typescript
   * await roomSession.startScreenShare({audio: true, video: true})
   * ```
   */
  startScreenShare(opts: {
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
   * add the `autoJoin` key to specify whether the device should immediately
   * join the room or joining will be performed manually later.
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
  addCamera(
    opts: MediaTrackConstraints & {
      /** Whether the device should automatically join the room. Default: `true`. */
      autoJoin?: boolean
    }
  ): Promise<RoomSessionDevice>

  /**
   * Adds a microphone device to the room. Using this method, a user can stream
   * multiple video sources at the same time.
   *
   * @param opts Specify the constraints for the device. In addition, you can
   * add the `autoJoin` key to specify whether the device should immediately
   * join the room or joining will be performed manually later.
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
  addMicrophone(
    opts: MediaTrackConstraints & {
      /** Whether the device should automatically join the room. Default: `true`. */
      autoJoin?: boolean
    }
  ): Promise<RoomSessionDevice>

  /**
   * Adds a device to the room. Using this method, a user can stream multiple
   * sources at the same time. If you need to add a camera device or a
   * microphone device, you can alternatively use the more specific methods
   * {@link addCamera} and {@link addMicrophone}.
   *
   * @param opts Specify the constraints for the device. In addition, you can
   * add the `autoJoin` key to specify whether the device should immediately
   * join the room or joining will be performed manually later.
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
  updateSpeaker(opts: { deviceId: string }): Promise<undefined>

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
}

interface RoomSessionConstructorDocs<T> {
  /**
   * Creates a new RoomSession.
   */
  new (opts: {
    /**
     * SignalWire video room token (get one from the [REST
     * APIs](https://developer.signalwire.com/apis/reference/create_room_token))
     */
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
}

interface RoomMemberMethodsInterfaceDocs {
  /**
   * Puts the microphone on mute. The other participants will not hear audio
   * from the muted participant anymore. You can use this method to mute
   * either yourself or another participant in the room.
   * @param params
   * @param params.memberId id of the member to mute. If omitted, mutes the
   * default device in the local client.
   *
   * @permissions
   *  - `room.self.audio_mute`: to mute a local device
   *  - `room.member.audio_mute`: to mute a remote member
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
   *
   * @example Muting your own microphone:
   * ```typescript
   * await room.audioMute()
   * ```
   *
   * @example Muting the microphone of another participant:
   * ```typescript
   * const id = 'de550c0c-3fac-4efd-b06f-b5b8614b8966'  // you can get this from getMembers()
   * await room.audioMute({memberId: id})
   * ```
   */
  audioMute(params?: { memberId?: string }): Promise<void>

  /**
   * Unmutes the microphone if it had been previously muted. You can use this
   * method to unmute either yourself or another participant in the room.
   * @param params
   * @param params.memberId id of the member to unmute. If omitted, unmutes
   * the default device in the local client.
   *
   * @permissions
   *  - `room.self.audio_unmute`: to unmute a local device
   *  - `room.member.audio_unmute`: to unmute a remote member
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
   *
   * @example Unmuting your own microphone:
   * ```typescript
   * await room.audioUnmute()
   * ```
   *
   * @example Unmuting the microphone of another participant:
   * ```typescript
   * const id = 'de550c0c-3fac-4efd-b06f-b5b8614b8966'  // you can get this from getMembers()
   * await room.audioUnmute({memberId: id})
   * ```
   */
  audioUnmute(params?: { memberId?: string }): Promise<void>

  /**
   * Puts the video on mute. Participants will see a mute image instead of the
   * video stream. You can use this method to mute either yourself or another
   * participant in the room.
   * @param params
   * @param params.memberId id of the member to mute. If omitted, mutes the
   * default device in the local client.
   *
   * @permissions
   *  - `room.self.video_mute`: to unmute a local device
   *  - `room.member.video_mute`: to unmute a remote member
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
   *
   * @example Muting your own video:
   * ```typescript
   * await room.videoMute()
   * ```
   *
   * @example Muting the video of another participant:
   * ```typescript
   * const id = 'de550c0c-3fac-4efd-b06f-b5b8614b8966'  // you can get this from getMembers()
   * await room.videoMute({memberId: id})
   * ```
   */
  videoMute(params?: { memberId?: string }): Promise<void>

  /**
   * Unmutes the video if it had been previously muted. Participants will
   * start seeing the video stream again. You can use this method to unmute
   * either yourself or another participant in the room.
   * @param params
   * @param params.memberId id of the member to unmute. If omitted, unmutes
   * the default device in the local client.
   *
   * @permissions
   *  - `room.self.video_mute`: to unmute a local device
   *  - `room.member.video_mute`: to unmute a remote member
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
   *
   * @example Unmuting your own video:
   * ```typescript
   * await room.videoUnmute()
   * ```
   *
   * @example Unmuting the video of another participant:
   * ```typescript
   * const id = 'de550c0c-3fac-4efd-b06f-b5b8614b8966'  // you can get this from getMembers()
   * await room.videoUnmute({memberId: id})
   * ```
   */
  videoUnmute(params?: { memberId?: string }): Promise<void>

  /**
   * Sets the input volume level (e.g. for the microphone). You can use this
   * method to set the input volume for either yourself or another participant
   * in the room.
   *
   * @param params
   * @param params.memberId id of the member for which to set input volume. If
   * omitted, sets the volume of the default device in the local client.
   * @param params.volume desired volume. Values range from -50 to 50, with a
   * default of 0.
   *
   * @permissions
   *  - `room.self.set_input_volume`: to set the volume for a local device
   *  - `room.member.set_input_volume`: to set the volume for a remote member
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
   *
   * @example Setting your own microphone volume:
   * ```typescript
   * await room.setInputVolume({volume: -10})
   * ```
   *
   * @example Setting the microphone volume of another participant:
   * ```typescript
   * const id = 'de550c0c-3fac-4efd-b06f-b5b8614b8966'  // you can get this from getMembers()
   * await room.setInputVolume({memberId: id, volume: -10})
   * ```
   */
  setInputVolume(params: { memberId?: string; volume: number }): Promise<void>

  /**
   * @deprecated Use {@link setInputVolume} instead.
   */
  setMicrophoneVolume(params: {
    memberId?: string
    volume: number
  }): Promise<void>

  /**
   * Sets the input level at which the participant is identified as currently
   * speaking. You can use this method to set the input sensitivity for either
   * yourself or another participant in the room.
   * @param params
   * @param params.memberId id of the member to affect. If omitted, affects
   * the default device in the local client.
   * @param params.value desired sensitivity. The default value is 30 and the
   * scale goes from 0 (lowest sensitivity, essentially muted) to 100 (highest
   * sensitivity).
   *
   * @permissions
   *  - `room.self.set_input_sensitivity`: to set the sensitivity for a local
   *    device
   *  - `room.member.set_input_sensitivity`: to set the sensitivity for a
   *    remote member
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
   *
   * @example Setting your own input sensitivity:
   * ```typescript
   * await room.setInputSensitivity({value: 80})
   * ```
   *
   * @example Setting the input sensitivity of another participant:
   * ```typescript
   * const id = 'de550c0c-3fac-4efd-b06f-b5b8614b8966'  // you can get this from getMembers()
   * await room.setInputSensitivity({memberId: id, value: 80})
   * ```
   */
  setInputSensitivity(params: {
    memberId?: string
    value: number
  }): Promise<void>
}

interface RoomControlMethodsInterfaceDocs {
  /**
   * Returns a list of members currently in the room.
   *
   * @example
   * ```typescript
   * await room.getMembers()
   * // returns:
   * {
   * "members": [
   *   {
   *     "visible": true,
   *     "room_session_id": "fde15619-13c1-4cb5-899d-96afaca2c52a",
   *     "input_volume": 0,
   *     "id": "1bf4d4fb-a3e4-4d46-80a8-3ebfdceb2a60",
   *     "input_sensitivity": 50,
   *     "output_volume": 0,
   *     "audio_muted": false,
   *     "on_hold": false,
   *     "name": "Mark",
   *     "deaf": false,
   *     "video_muted": false,
   *     "room_id": "aae25822-892c-4832-b0b3-34aac3a0e8d1",
   *     "type": "member"
   *   },
   *   {
   *     "visible": true,
   *     "room_session_id": "fde15619-13c1-4cb5-899d-96afaca2c52a",
   *     "input_volume": 0,
   *     "id": "e0c5be44-d6c7-438f-8cda-f859a1a0b1e7",
   *     "input_sensitivity": 50,
   *     "output_volume": 0,
   *     "audio_muted": false,
   *     "on_hold": false,
   *     "name": "David",
   *     "deaf": false,
   *     "video_muted": false,
   *     "room_id": "aae25822-892c-4832-b0b3-34aac3a0e8d1",
   *     "type": "member"
   *   }
   * ]
   * }
   * ```
   */
  getMembers(): Rooms.GetMembers

  /**
   * Mutes the incoming audio. The affected participant will not hear audio
   * from the other participants anymore. You can use this method to make deaf
   * either yourself or another participant in the room.
   *
   * Note that in addition to making a participant deaf, this will also
   * automatically mute the microphone of the target participant (even if
   * there is no `audio_mute` permission). If you want, you can then manually
   * unmute it by calling {@link audioUnmute}.
   * @param params
   * @param params.memberId id of the member to affect. If omitted, affects
   * the default device in the local client.
   *
   * @permissions
   *  - `room.self.deaf`: to make yourself deaf
   *  - `room.member.deaf`: to make deaf a remote member
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
   *
   * @example Making yourself deaf:
   * ```typescript
   * await room.deaf()
   * ```
   *
   * @example Making another participant deaf:
   * ```typescript
   * const id = 'de550c0c-3fac-4efd-b06f-b5b8614b8966'  // you can get this from getMembers()
   * await room.deaf({memberId: id})
   * ```
   */
  deaf(params?: { memberId?: string }): Promise<void>

  /**
   * Unmutes the incoming audio. The affected participant will start hearing
   * audio from the other participants again. You can use this method to
   * undeaf either yourself or another participant in the room.
   *
   * Note that in addition to allowing a participants to hear the others, this
   * will also automatically unmute the microphone of the target participant
   * (even if there is no `audio_unmute` permission). If you want, you can then
   * manually mute it by calling {@link audioMute}.
   * @param params
   * @param params.memberId id of the member to affect. If omitted, affects
   * the default device in the local client.
   *
   * @permissions
   *  - `room.self.deaf`: to make yourself deaf
   *  - `room.member.deaf`: to make deaf a remote member
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
   *
   * @example Undeaf yourself:
   * ```typescript
   * await room.undeaf()
   * ```
   *
   * @example Undeaf another participant:
   * ```typescript
   * const id = 'de550c0c-3fac-4efd-b06f-b5b8614b8966'  // you can get this from getMembers()
   * await room.undeaf({memberId: id})
   * ```
   */
  undeaf(params?: { memberId?: string }): Promise<void>

  /**
   * Sets the output volume level (e.g., for the speaker). You can use this
   * method to set the output volume for either yourself or another participant
   * in the room.
   * @param params
   * @param params.memberId id of the member to affect. If omitted, affects the
   * default device in the local client.
   * @param params.volume desired volume. Values range from -50 to 50, with a
   * default of 0.
   *
   * @permissions
   *  - `room.self.set_output_volume`: to set the speaker volume for yourself
   *  - `room.member.set_output_volume`: to set the speaker volume for a remote
   *    member
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
   *
   * @example Setting your own output volume:
   * ```typescript
   * await room.setOutputVolume({volume: -10})
   * ```
   *
   * @example Setting the output volume of another participant:
   * ```typescript
   * const id = 'de550c0c-3fac-4efd-b06f-b5b8614b8966'  // you can get this from getMembers()
   * await room.setOutputVolume({memberId: id, volume: -10})
   * ```
   */
  setOutputVolume(params: { memberId?: string; volume: number }): Promise<void>

  /**
   * @deprecated Use {@link setOutputVolume} instead.
   */
  setSpeakerVolume(params: { memberId?: string; volume: number }): Promise<void>

  /**
   * Removes a specific participant from the room.
   * @param params
   * @param params.memberId id of the member to remove
   *
   * @permissions
   *  - `room.member.remove`: to remove a remote member
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
   *
   * @example
   * ```typescript
   * const id = 'de550c0c-3fac-4efd-b06f-b5b8614b8966'  // you can get this from getMembers()
   * await room.removeMember({memberId: id})
   * ```
   */
  removeMember(params: { memberId: string }): Promise<void>

  /**
   * Do not show muted videos in the room layout.
   *
   * @deprecated Use {@link setHideVideoMuted} instead.
   *
   * @permissions
   *  - `room.hide_video_muted`
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
   *
   * @example
   * ```typescript
   * await room.hideVideoMuted()
   * ```
   */
  hideVideoMuted(): Promise<void>

  /**
   * Show muted videos in the room layout in addition to the unmuted ones.
   * Members that have been muted via {@link videoMute} will display a mute
   * image instead of the video.
   *
   * @deprecated Use {@link setHideVideoMuted} instead.
   *
   * @permissions
   *  - `room.show_video_muted`
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
   *
   * @example
   * ```typescript
   * await room.showVideoMuted()
   * ```
   */
  showVideoMuted(): Promise<void>

  /**
   * Show or hide muted videos in the room layout. Members that have been muted
   * via {@link videoMute} will display a mute image instead of the video, if
   * this setting is enabled.
   *
   * @param value whether to show muted videos in the room layout.
   *
   * @permissions
   *  - `room.hide_video_muted`
   *  - `room.show_video_muted`
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
   *
   * @example
   * ```typescript
   * await roomSession.setHideVideoMuted(false)
   * ```
   */
  setHideVideoMuted(value: boolean): Promise<void>

  /**
   * Obtains a list of recordings for the current room session. To download the
   * actual mp4 file, please use the [REST
   * API](https://developer.signalwire.com/apis/reference/overview).
   *
   * @permissions
   *  - `room.recording`
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
   *
   * @example
   * ```typescript
   * await room.getRecordings()
   * // returns:
   * {
   *   "recordings": [
   *     {
   *       "id": "94ec917c-ff9c-4d57-9111-7d93a8f6e3e8",
   *       "state": "completed",
   *       "duration": 4.66,
   *       "started_at": 1630681129.936,
   *       "ended_at": 1630681133.7655
   *     }
   *   ]
   * }
   * ```
   *
   * From your server, you can obtain the mp4 file using the [REST API](https://developer.signalwire.com/apis/reference/overview):
   * ```typescript
   * curl --request GET \
   *      --url https://<yourspace>.signalwire.com/api/video/room_recordings/<recording_id> \
   *      --header 'Accept: application/json' \
   *      --header 'Authorization: Basic <your API token>'
   * ```
   */
  getRecordings(): Rooms.GetRecordings

  /**
   * Starts the recording of the room. You can use the returned
   * {@link RoomSessionRecording} object to control the recording (e.g., pause,
   * resume, stop).
   *
   * @permissions
   *  - `room.recording`
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
   *
   * @example
   * ```typescript
   * const rec = await room.startRecording()
   * await rec.stop()
   * ```
   */
  startRecording(): Promise<Rooms.RoomSessionRecording>

  /**
   * Obtains a list of recordings for the current room session.
   *
   * @permissions
   *  - `room.playback`
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
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
   * @param params.url The url (http, https, rtmp, rtmps) of the stream to
   * reproduce.
   * @param params.volume The audio volume at which to play the stream. Values
   * range from -50 to 50, with a default of 0.
   *
   * @permissions
   *  - `room.playback`
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
   *
   * @example
   * ```typescript
   * const playback = await roomSession.play({ url: 'rtmp://example.com/foo' })
   * await playback.stop()
   * ```
   */
  play(params: {
    url: string
    volume?: number,
    positions?: Record<
      string,
      | 'reserved'
      | `reserved-${number}`
      | 'standard'
      | `standard-${number}`
      | 'off-canvas'
    >
  }): Promise<Rooms.RoomSessionPlayback>
}

interface RoomLayoutMethodsInterface {
  /**
   * Returns a list of available layouts for the room. To set a room layout,
   * use {@link setLayout}.
   *
   * @permissions
   *  - `room.list_available_layouts`
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
   *
   * @example
   * ```typescript
   * await room.getLayouts()
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
  getLayouts(): Rooms.GetLayouts

  /**
   * Sets a layout for the room. You can obtain a list of available layouts
   * with {@link getLayouts}.
   * @param params
   * @param params.name name of the layout
   *
   * @permissions
   *  - `room.set_layout`
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
   *
   * @example Set the 6x6 layout:
   * ```typescript
   * await room.setLayout({name: "6x6"})
   * ```
   */
  setLayout(params: {
    name: string
    positions?: Record<
      string,
      | 'reserved'
      | `reserved-${number}`
      | 'standard'
      | `standard-${number}`
      | 'off-canvas'
    >
  }): Rooms.SetLayout

  setPositions(params: {
    positions?: Record<
      string,
      | 'reserved'
      | `reserved-${number}`
      | 'standard'
      | `standard-${number}`
      | 'off-canvas'
    >
  }): Promise<void>

  setPosition(params: {
    memberId?: string
    position:
      | 'reserved'
      | `reserved-${number}`
      | 'standard'
      | `standard-${number}`
      | 'off-canvas'
  }): Promise<void>
}

/**
 * List of events emitted by a {@link RoomSession} object.
 */
export interface RoomSessionEvents {
  /**
   * The current client joined the room session. The event handler receives
   * objects that contain information about the room and all its members
   * (including the current client). The objects received by the event handler
   * have the following type:
   *
   * ```typescript
   * type _ = {
   *   room_session: {
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
   * The set of members or one or more properties of a member have changed. The
   * event handler receives an object `e` with the updated, full list of members in
   * the room as `e.members`.
   * 
   * @event
   */
  'memberList.updated': undefined

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
   * token has the `room.recording` permission. The event handler receives a
   * {@link RoomSessionRecording} object.
   *
   * @event
   */
  'recording.updated': undefined

  /**
   * An active recording has been stopped. You only receive this event if your
   * token has the `room.recording` permission. The event handler receives a
   * {@link RoomSessionRecording} object.
   *
   * @event
   */
  'recording.ended': undefined

  /**
   * A playback has been started. You only receive this event if your token has
   * the `room.playback` permission. The event handler receives a
   * {@link RoomSessionPlayback} object.
   *
   * @event
   */
  'playback.started': undefined

  /**
   * A playback has been updated. You only receive this event if your token has
   * the `room.playback` permission. The event handler receives a
   * {@link RoomSessionPlayback} object.
   *
   * @event
   */
  'playback.updated': undefined

  /**
   * A playback has ended. You only receive this event if your token has
   * the `room.playback` permission. The event handler receives a
   * {@link RoomSessionPlayback} object.
   *
   * @event
   */
  'playback.ended': undefined
}
