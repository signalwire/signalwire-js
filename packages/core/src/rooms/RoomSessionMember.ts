import {
  FabricMemberEventNames,
  FabricMemberJoinedEventParams,
  FabricMemberLeftEventParams,
  FabricMemberTalkingEventParams,
  FabricMemberUpdatedEventParams,
} from '../types/fabricMember'
import { FabricMemberContract } from '../types/fabricMember'
import { BaseComponent } from '../BaseComponent'
import { BaseComponentOptionsWithPayload } from '../utils/interfaces'
import { connect } from '../redux'

export interface RoomSessionMember extends FabricMemberContract {
  setPayload(payload: RoomSessionMemberEventParams): void
}

export type RoomSessionMemberEventsHandlerMapping = Record<
  FabricMemberEventNames,
  (playback: RoomSessionMember) => void
>

export interface RoomSessionMemberOptions
  extends BaseComponentOptionsWithPayload<RoomSessionMemberEventParams> {}

export type RoomSessionMemberEventParams =
  | FabricMemberJoinedEventParams
  | FabricMemberLeftEventParams
  | FabricMemberUpdatedEventParams
  | FabricMemberTalkingEventParams

// @TODO: Implement class using a contract
export class RoomSessionMemberAPI
  extends BaseComponent<RoomSessionMemberEventsHandlerMapping>
  implements FabricMemberContract
{
  private _payload: RoomSessionMemberEventParams

  constructor(options: RoomSessionMemberOptions) {
    super(options)
    this._payload = options.payload
  }

  get id() {
    return this._payload.member.id ?? this._payload.member.member_id
  }

  get callId() {
    return this._payload.member.call_id
  }

  get nodeId() {
    return this._payload.member.node_id
  }

  get memberId() {
    return this.id
  }

  get roomSessionId() {
    return this._payload.room_session_id
  }

  get roomId() {
    return this._payload.room_id
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
      ...this._payload,
      member: {
        ...this._payload.member,
        ...payload.member,
      },
    }
    this._payload = newPayload
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
