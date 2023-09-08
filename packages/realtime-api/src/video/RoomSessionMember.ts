import {
  connect,
  BaseComponent,
  BaseComponentOptionsWithPayload,
  extendComponent,
  Rooms,
  VideoMemberContract,
  VideoMemberMethods,
  EntityUpdated,
  VideoMemberJoinedEventParams,
  VideoMemberLeftEventParams,
  VideoMemberUpdatedEventParams,
  VideoMemberTalkingEventParams,
} from '@signalwire/core'

/**
 * Represents a member of a room session. You receive instances of this type by
 * listening to room events, for example on a {@link RoomSession} object.
 *
 * > ℹ️ State of RoomSessionMember objects
 * >
 * > The state of RoomSessionMember objects, for example `member.visible`, is
 * > immutable. When you receive instances of RoomSessionMember from event
 * > listeners, the state of the member always refers to that specific point in
 * > time and remains fixed for the whole lifetime of the object.
 */
export interface RoomSessionMember extends VideoMemberContract {
  setPayload(payload: RoomSessionMemberEventParams): void
}
export type RoomSessionMemberUpdated = EntityUpdated<RoomSessionMember>

export type RoomSessionMemberEventParams =
  | (
      | VideoMemberJoinedEventParams
      | VideoMemberLeftEventParams
      | VideoMemberUpdatedEventParams
    ) &
      VideoMemberTalkingEventParams

export interface RoomSessionMemberOptions
  extends BaseComponentOptionsWithPayload<RoomSessionMemberEventParams> {}

// TODO: Extend from a variant of `BaseComponent` that
// doesn't expose EventEmitter methods
class RoomSessionMemberComponent extends BaseComponent<{}> {
  private _payload: RoomSessionMemberEventParams

  constructor(options: RoomSessionMemberOptions) {
    super(options)

    this._payload = options.payload
  }

  get id() {
    return this._payload.member.id
  }

  get memberId() {
    return this._payload.member.id
  }

  get roomSessionId() {
    return this._payload.member.room_session_id
  }

  get roomId() {
    return this._payload.member.room_id
  }

  get parentId() {
    return this._payload.member.parent_id
  }

  get name() {
    return this._payload.member.name
  }

  get type() {
    return this._payload.member.type
  }

  get meta() {
    return this._payload.member.meta
  }

  get requestedPosition() {
    return this._payload.member.requested_position
  }

  get visible() {
    return this._payload.member.visible
  }

  get audioMuted() {
    return this._payload.member.audio_muted
  }

  get videoMuted() {
    return this._payload.member.video_muted
  }

  get deaf() {
    return this._payload.member.deaf
  }

  get inputVolume() {
    return this._payload.member.input_volume
  }

  get outputVolume() {
    return this._payload.member.output_volume
  }

  get inputSensitivity() {
    return this._payload.member.input_sensitivity
  }

  get talking() {
    return this._payload.member.talking
  }

  get handraised() {
    return this._payload.member.handraised
  }

  /** @internal */
  protected setPayload(payload: RoomSessionMemberEventParams) {
    // Reshape the payload since the `video.member.talking` event does not return all the parameters of a member
    const newPayload = {
      ...payload,
      member: {
        ...this._payload.member,
        ...payload.member,
      },
    }
    this._payload = newPayload
  }

  async remove() {
    await this.execute({
      method: 'video.member.remove',
      params: {
        room_session_id: this.getStateProperty('roomSessionId'),
        member_id: this.getStateProperty('memberId'),
      },
    })
  }
}

const RoomSessionMemberAPI = extendComponent<
  RoomSessionMemberComponent,
  // `remove` is defined by `RoomSessionMemberComponent`
  Omit<VideoMemberMethods, 'remove'>
>(RoomSessionMemberComponent, {
  audioMute: Rooms.audioMuteMember,
  audioUnmute: Rooms.audioUnmuteMember,
  videoMute: Rooms.videoMuteMember,
  videoUnmute: Rooms.videoUnmuteMember,
  setDeaf: Rooms.setDeaf,
  setMicrophoneVolume: Rooms.setInputVolumeMember,
  setInputVolume: Rooms.setInputVolumeMember,
  setSpeakerVolume: Rooms.setOutputVolumeMember,
  setOutputVolume: Rooms.setOutputVolumeMember,
  setInputSensitivity: Rooms.setInputSensitivityMember,
  setRaisedHand: Rooms.setRaisedHand,
})

export const createRoomSessionMemberObject = (
  params: RoomSessionMemberOptions
): RoomSessionMember => {
  const member = connect<{}, RoomSessionMemberComponent, RoomSessionMember>({
    store: params.store,
    Component: RoomSessionMemberAPI,
  })(params)

  return member
}
