import {
  BaseComponent,
  BaseComponentOptionsWithPayload,
  CallJoined,
  CallJoinedEventParams,
  CallSegmentContract,
  RoomSessionMember,
  connect,
} from '@signalwire/core'

type CallSegmentPayload = CallJoinedEventParams & {
  members: RoomSessionMember[]
}

export interface CallSegment extends CallSegmentContract {
  setPayload(payload: CallSegmentPayload): void
}

export type CallSegmentEventsHandlerMapping = Record<
  CallJoined,
  (playback: CallSegment) => void
>

export interface CallSegmentOptions
  extends BaseComponentOptionsWithPayload<CallSegmentPayload> {}

export class CallSegmentAPI extends BaseComponent<CallSegmentEventsHandlerMapping> {
  private _payload: CallSegmentPayload & { members: RoomSessionMember[] }

  constructor(options: CallSegmentOptions) {
    super(options)

    this._payload = options.payload
  }

  get roomId() {
    return this._payload.room_id
  }

  get roomSessionId() {
    return this._payload.room_session_id
  }

  get callId() {
    return this._payload.call_id
  }

  get memberId() {
    return this._payload.member_id
  }

  get roomSession() {
    return this._payload.room_session
  }

  get members() {
    return this._payload.members
  }

  get member() {
    return this.members?.find((member) => member.memberId === this.memberId)
  }

  /** @internal */
  protected setPayload(payload: CallSegmentPayload) {
    this._payload = payload
  }
}

export const createCallSegmentObject = (
  params: CallSegmentOptions
): CallSegment => {
  const playback = connect<
    CallSegmentEventsHandlerMapping,
    CallSegmentAPI,
    CallSegment
  >({
    store: params.store,
    Component: CallSegmentAPI,
  })(params)

  return playback
}
