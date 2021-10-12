import type { Rooms } from '@signalwire/core'

export interface RoomMemberMethodsInterfaceDocs {
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
  audioMute(params: { memberId?: string }): Promise<void>

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
  audioUnmute(params: { memberId?: string }): Promise<void>

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
  videoMute(params: { memberId?: string }): Promise<void>

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
  videoUnmute(params: { memberId?: string }): Promise<void>

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
  setInputVolume(params: { memberId?: string, volume: number }): Promise<void>

  /**
   * @deprecated Use {@link setInputVolume} instead.
   */
  setMicrophoneVolume(params: { memberId?: string, volume: number }): Promise<void>

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
  setInputSensitivity(params: { memberId?: string, value: number }): Promise<void>
}

export interface RoomControlMethodsInterfaceDocs {
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
  deaf(params: { memberId?: string }): Promise<void>

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
  undeaf(params: { memberId?: string }): Promise<void>

  /**
   * Sets the output volume level (e.g., for the speaker). You can use this
   * method to set the output volume for either yourself or another participant
   * in the room.
   * @param params 
   * @param params.memberId id of the member to affect. If omitted, affects the
   * default device in the local client.
   * @param params.value desired volume. Values range from -50 to 50, with a
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
  setOutputVolume(params: { memberId?: string, volume: number }): Promise<void>

  /**
   * @deprecated Use {@link setOutputVolume} instead.
   */
  setSpeakerVolume(params: { memberId?: string, volume: number }): Promise<void>

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
  play(params: {url: string, volume?: number}): Promise<Rooms.RoomSessionPlayback>
}

export interface RoomMemberSelfMethodsInterfaceDocs {
  /**
   * Puts the microphone on mute. The other participants will not hear audio
   * from the muted device anymore.
   * 
   * @permissions
   *  - `room.self.audio_mute`
   * 
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
   * 
   * @example Muting the microphone:
   * ```typescript
   * await roomdevice.audioMute()
   * ```
   */
  audioMute(): Rooms.AudioMuteMember

  /**
   * Unmutes the microphone if it had been previously muted.
   * 
   * @permissions
   *  - `room.self.audio_unmute`
   * 
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
   * 
   * @example Unmuting the microphone:
   * ```typescript
   * await roomdevice.audioUnmute()
   * ```
   */
  audioUnmute(): Rooms.AudioUnmuteMember

  /**
   * Puts the video on mute. Participants will see a mute image instead of the
   * video stream.
   * 
   * @permissions
   *  - `room.self.video_mute`
   * 
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
   * 
   * @example Muting the camera:
   * ```typescript
   * await roomdevice.videoMute()
   * ```
   */
  videoMute(): Rooms.VideoMuteMember

  /**
   * Unmutes the video if it had been previously muted. Participants will start
   * seeing the video stream again.
   * 
   * @permissions
   *  - `room.self.video_unmute`
   * 
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
   * 
   * @example Unmuting the camera:
   * ```typescript
   * await roomdevice.videoUnmute()
   * ```
   */
  videoUnmute(): Rooms.VideoUnmuteMember

  /**
   * @deprecated Use {@link setInputVolume} instead.
   */
  setMicrophoneVolume(params: { volume: number }): Rooms.SetInputVolumeMember

  /**
   * Sets the input volume level (e.g. for the microphone).
   * @param params 
   * @param params.volume desired volume. Values range from -50 to 50, with a
   * default of 0.
   *
   * @permissions
   *  - `room.self.set_input_volume`
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
   *
   * @example
   * ```typescript
   * await roomdevice.setMicrophoneVolume({volume: -10})
   * ```
   */
  setInputVolume(params: { volume: number }): Rooms.SetInputVolumeMember

  /**
   * Sets the input level at which the participant is identified as currently
   * speaking.
   * @param params 
   * @param params.value desired sensitivity. The default value is 30 and the
   * scale goes from 0 (lowest sensitivity, essentially muted) to 100 (highest
   * sensitivity).
   *
   * @permissions
   *  - `room.self.set_input_sensitivity`
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
   *
   * @example
   * ```typescript
   * await roomdevice.setInputSensitivity({value: 80})
   * ```
   */
  setInputSensitivity(params: {
    value: number
  }): Rooms.SetInputSensitivityMember
}
