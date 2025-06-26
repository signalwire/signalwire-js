import {
  FabricMemberEventNames,
  FabricMemberEventParams,
  FabricMemberEventParamsExcludeTalking,
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

export interface UnifiedCommunicationSessionMember
  extends FabricMemberContract {
  /** Unique id of this member. */
  id: string
  setPayload(payload: FabricMemberEventParams): void
}

// TODO: Fabric Room Session Member instance does not emit any events yet
export type UnifiedCommunicationSessionMemberEventsHandlerMap = Record<
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

export type UnifiedCommunicationSessionMemberEvents = {
  [k in keyof UnifiedCommunicationSessionMemberEventsHandlerMap]: UnifiedCommunicationSessionMemberEventsHandlerMap[k]
}

export interface UnifiedCommunicationSessionMemberOptions
  extends BaseComponentOptionsWithPayload<FabricMemberEventParamsExcludeTalking> {}

export class UnifiedCommunicationSessionMemberAPI
  extends BaseComponent<UnifiedCommunicationSessionMemberEvents>
  implements FabricMemberContract
{
  private _payload: FabricMemberEventParamsExcludeTalking

  constructor(options: UnifiedCommunicationSessionMemberOptions) {
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

export const createUnifiedCommunicationSessionMemberObject = (
  params: UnifiedCommunicationSessionMemberOptions
): UnifiedCommunicationSessionMember => {
  const member = connect<
    UnifiedCommunicationSessionMemberEventsHandlerMap,
    UnifiedCommunicationSessionMemberAPI,
    UnifiedCommunicationSessionMember
  >({
    store: params.store,
    Component: UnifiedCommunicationSessionMemberAPI,
  })(params)

  return member
}
