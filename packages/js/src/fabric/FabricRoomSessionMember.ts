import {
  FabricMemberEventNames,
  FabricMemberEventParams,
  FabricMemberEventParamsWithoutTalking,
  FabricMemberJoinedEventParams,
  FabricMemberLeftEventParams,
  FabricMemberTalkingEventParams,
  FabricMemberUpdatedEventParams,
  FabricMemberContract,
  connect,
  MemberJoined,
  MemberLeft,
  MemberTalking,
  MemberUpdated,
  BaseComponentOptionsWithPayload,
  BaseComponent,
} from '@signalwire/core'

export interface FabricRoomSessionMember extends FabricMemberContract {
  /** Unique id of this member. */
  id: string
  setPayload(payload: FabricMemberEventParams): void
}

export type FabricRoomSessionMemberEventsHandlerMap = Record<
  MemberJoined,
  (params: FabricMemberJoinedEventParams) => void
> &
  Record<MemberUpdated, (params: FabricMemberUpdatedEventParams) => void> &
  Record<MemberLeft, (params: FabricMemberLeftEventParams) => void> &
  Record<MemberTalking, (params: FabricMemberTalkingEventParams) => void> &
  Record<
    Exclude<FabricMemberEventNames, MemberJoined | MemberLeft | MemberTalking>,
    (params: FabricMemberUpdatedEventParams) => void
  >

export type FabricRoomSessionMemberEvents = {
  [k in keyof FabricRoomSessionMemberEventsHandlerMap]: FabricRoomSessionMemberEventsHandlerMap[k]
}

export interface FabricRoomSessionMemberOptions
  extends BaseComponentOptionsWithPayload<FabricMemberEventParamsWithoutTalking> {}

export class FabricRoomSessionMemberAPI
  extends BaseComponent<FabricRoomSessionMemberEvents>
  implements FabricMemberContract
{
  private _payload: FabricMemberEventParamsWithoutTalking

  constructor(options: FabricRoomSessionMemberOptions) {
    super(options)
    this._payload = options.payload
  }

  get id() {
    return this._payload.member.member_id
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

  get name() {
    return this._payload.member.name
  }

  get type() {
    return this._payload.member.type
  }

  get meta() {
    return this._payload.member.meta
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
  setPayload(payload: FabricMemberEventParams) {
    // Reshape the payload since the `member.talking` event does not return all the parameters of a member
    const newPayload = {
      ...this._payload,
      ...payload,
      member: {
        ...this._payload.member,
        ...payload.member,
      },
    }
    this._payload = newPayload
  }
}

export const createFabricRoomSessionMemberObject = (
  params: FabricRoomSessionMemberOptions
): FabricRoomSessionMember => {
  const member = connect<
    FabricRoomSessionMemberEventsHandlerMap,
    FabricRoomSessionMemberAPI,
    FabricRoomSessionMember
  >({
    store: params.store,
    Component: FabricRoomSessionMemberAPI,
  })(params)

  return member
}
