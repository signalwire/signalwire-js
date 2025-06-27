import {
  connect,
  MemberJoined,
  MemberLeft,
  MemberTalking,
  MemberUpdated,
  BaseComponentOptionsWithPayload,
  BaseComponent,
} from '@signalwire/core'
import {
  CallMemberEventNames,
  CallMemberEventParams,
  CallMemberEventParamsExcludeTalking,
  CallMemberJoinedEventParams,
  CallMemberLeftEventParams,
  CallMemberTalkingEventParams,
  CallMemberUpdatedEventParams,
  CallMemberContract,
} from '../utils/interfaces'

export interface CallSessionMember extends CallMemberContract {
  /** Unique id of this member. */
  id: string
  setPayload(payload: CallMemberEventParams): void
}

// TODO: Fabric Room Session Member instance does not emit any events yet
export type CallSessionMemberEventsHandlerMap = Record<
  MemberJoined,
  (params: CallMemberJoinedEventParams) => void
> &
  Record<MemberUpdated, (params: CallMemberUpdatedEventParams) => void> &
  Record<MemberLeft, (params: CallMemberLeftEventParams) => void> &
  Record<MemberTalking, (params: CallMemberTalkingEventParams) => void> &
  Record<
    Exclude<CallMemberEventNames, MemberJoined | MemberLeft | MemberTalking>,
    (params: CallMemberUpdatedEventParams) => void
  >

export type CallSessionMemberEvents = {
  [k in keyof CallSessionMemberEventsHandlerMap]: CallSessionMemberEventsHandlerMap[k]
}

export interface CallSessionMemberOptions
  extends BaseComponentOptionsWithPayload<CallMemberEventParamsExcludeTalking> {}

export class CallSessionMemberAPI
  extends BaseComponent<CallSessionMemberEvents>
  implements CallMemberContract
{
  private _payload: CallMemberEventParamsExcludeTalking

  constructor(options: CallSessionMemberOptions) {
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

  get parentId() {
    return this._payload.member.parent_id
  }

  get name() {
    return this._payload.member.name
  }

  get type() {
    return this._payload.member.type
  }

  get requestedPosition() {
    return this._payload.member.requested_position
  }

  get currentPosition() {
    return this._payload.member.current_position
  }

  get meta() {
    return this._payload.member.meta
  }

  get handraised() {
    return this._payload.member.handraised
  }

  get talking() {
    return this._payload.member.talking
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

  get visible() {
    return this._payload.member.visible
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

  get subscriberData() {
    return this._payload.member.subscriber_data
  }

  /** @internal */
  setPayload(payload: CallMemberEventParams) {
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

export const createCallSessionMemberObject = (
  params: CallSessionMemberOptions
): CallSessionMember => {
  const member = connect<
    CallSessionMemberEventsHandlerMap,
    CallSessionMemberAPI,
    CallSessionMember
  >({
    store: params.store,
    Component: CallSessionMemberAPI,
  })(params)

  return member
}
