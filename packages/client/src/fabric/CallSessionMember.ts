import {
  connect,
  MemberJoined,
  MemberLeft,
  MemberTalking,
  MemberUpdated,
  BaseComponentOptionsWithPayload,
  BaseComponent,
  MemberEventNames,
  MemberEventParams,
  MemberEventParamsExcludeTalking,
  MemberJoinedEventParams,
  MemberLeftEventParams,
  MemberTalkingEventParams,
  MemberUpdatedEventParams,
  MemberContract,
} from '@signalwire/core'
import {} from '../utils/interfaces'

export interface CallSessionMember extends MemberContract {
  /** Unique id of this member. */
  id: string
  setPayload(payload: MemberEventParams): void
}

// TODO: ProgrammableCalls Room Session Member instance does not emit any events yet
export type CallSessionMemberEventsHandlerMap = Record<
  MemberJoined,
  (params: MemberJoinedEventParams) => void
> &
  Record<MemberUpdated, (params: MemberUpdatedEventParams) => void> &
  Record<MemberLeft, (params: MemberLeftEventParams) => void> &
  Record<MemberTalking, (params: MemberTalkingEventParams) => void> &
  Record<
    Exclude<MemberEventNames, MemberJoined | MemberLeft | MemberTalking>,
    (params: MemberUpdatedEventParams) => void
  >

export type CallSessionMemberEvents = {
  [k in keyof CallSessionMemberEventsHandlerMap]: CallSessionMemberEventsHandlerMap[k]
}

export interface CallSessionMemberOptions
  extends BaseComponentOptionsWithPayload<MemberEventParamsExcludeTalking> {}

export class CallSessionMemberAPI
  extends BaseComponent<CallSessionMemberEvents>
  implements MemberContract
{
  private _payload: MemberEventParamsExcludeTalking

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

  get subscriberId() {
    return this._payload.member.subscriber_id
  }

  get addressId() {
    return this._payload.member.address_id
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

  get echoCancellation() {
    return this._payload.member.echo_cancellation
  }

  get autoGain() {
    return this._payload.member.auto_gain
  }

  get noiseSuppression() {
    return this._payload.member.noise_suppression
  }

  /** @internal */
  setPayload(payload: MemberEventParams) {
    // Reshape the payload since the `member.talking` event does not return all the parameters of a member
    const newPayload: MemberEventParamsExcludeTalking = {
      ...this._payload,
      ...payload,
      member: {
        ...this._payload.member,
        ...payload.member,
      },
    } as MemberEventParamsExcludeTalking
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
