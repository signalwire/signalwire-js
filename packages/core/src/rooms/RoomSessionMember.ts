import {
  VideoMemberContract,
  VideoMemberEventNames,
  VideoMemberEventParams,
  VideoMemberJoinedEventParams,
  VideoMemberLeftEventParams,
  VideoMemberTalkingEventParams,
  VideoMemberUpdatedEventParams,
} from '../types/videoMember'
import { BaseComponent } from '../BaseComponent'
import { BaseComponentOptionsWithPayload } from '../utils/interfaces'
import { connect } from '../redux'

export interface RoomSessionMember extends VideoMemberContract {
  setPayload(payload: VideoMemberEventParams): void
}

export type RoomSessionMemberEventsHandlerMapping = Record<
  VideoMemberEventNames,
  (playback: RoomSessionMember) => void
>

export interface RoomSessionMemberOptions
  extends BaseComponentOptionsWithPayload<VideoMemberEventParams> {}

export type RoomSessionMemberEventParams =
  | (
      | VideoMemberJoinedEventParams
      | VideoMemberLeftEventParams
      | VideoMemberUpdatedEventParams
    ) &
      VideoMemberTalkingEventParams

// @TODO: Implement class using a contract
export class RoomSessionMemberAPI extends BaseComponent<RoomSessionMemberEventsHandlerMapping> {
  private _payload: VideoMemberEventParams

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

  get currentPosition() {
    return this._payload.member.current_position
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
  setPayload(payload: RoomSessionMemberEventParams) {
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
        room_session_id: this.roomSessionId,
        member_id: this.memberId,
      },
    })
  }
}

export const createRoomSessionMemberObject = (
  params: RoomSessionMemberOptions
): RoomSessionMember => {
  const member = connect<
    RoomSessionMemberEventsHandlerMapping,
    RoomSessionMemberAPI,
    RoomSessionMember
  >({
    store: params.store,
    Component: RoomSessionMemberAPI,
  })(params)

  return member
}
