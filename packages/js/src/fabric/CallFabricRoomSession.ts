import {
  BaseComponentOptions,
  connect,
  ExecuteExtendedOptions,
  JSONRPCMethod,
  VideoMemberEntity,
  Rooms,
  VideoLayoutChangedEventParams,
  BaseRPCResult,
  RoomSessionMember,
} from '@signalwire/core'
import {
  BaseRoomSession,
  RoomSessionConnection,
  RoomSessionObjectEventsHandlerMapping,
} from '../BaseRoomSession'
import { callFabricWorker } from './workers'
import {
  MemberCommandWithVolumeParams,
  MemberCommandWithValueParams,
} from '../video'
import { BaseConnection } from '@signalwire/webrtc'

interface ExecuteActionParams {
  method: JSONRPCMethod
  extraParams?: Record<string, any>
}

interface ExecuteMemberActionParams extends ExecuteActionParams {
  channel?: 'audio' | 'video'
  memberId?: string
}

type CallFabricBaseRoomSession = Omit<
  BaseRoomSession<CallFabricRoomSessionConnection>,
  'join'
>

export interface CallFabricRoomSession extends CallFabricBaseRoomSession {
  start: CallFabricRoomSessionConnection['start']
  answer: BaseConnection<CallFabricRoomSession>['answer']
  hangup: RoomSessionConnection['hangup']
}

export class CallFabricRoomSessionConnection extends RoomSessionConnection {
  private _self?: RoomSessionMember
  private _member?: RoomSessionMember
  private _lastLayoutEvent: VideoLayoutChangedEventParams

  protected initWorker() {
    /**
     * The unified eventing or CallFabric worker creates/stores member instances in the instance map
     * For now, the member instances are only required in the CallFabric SDK
     * It also handles `call.*` events
     */
    this.runWorker('callFabricWorker', {
      worker: callFabricWorker,
    })
  }

  override async hangup(id?: string | undefined): Promise<void> {
    this._self = undefined
    this._member = undefined
    const result = await super.hangup(id)
    return result
  }

  async start() {
    return new Promise<void>(async (resolve, reject) => {
      try {
        this.once('room.subscribed', () => resolve())

        await this.join()
      } catch (error) {
        this.logger.error('WSClient call start', error)
        reject(error)
      }
    })
  }

  /** @internal */
  override async resume() {
    this.logger.warn(`[resume] Call ${this.id}`)
    if (this.peer?.instance) {
      const { connectionState } = this.peer.instance
      this.logger.debug(
        `[resume] connectionState for ${this.id} is '${connectionState}'`
      )
      if (['closed', 'failed', 'disconnected'].includes(connectionState)) {
        this.resuming = true
        this.peer.restartIce()
      }
    }
  }

  get selfMember(): RoomSessionMember|undefined {
    return this._self
  }

  set selfMember(member: RoomSessionMember|undefined) {
    this._self = member
  }

  set member(member: RoomSessionMember) {
    this._member = member
  }

  override get memberId() {
    return this._member?.memberId
  }

  set lastLayoutEvent(event: any) {
    this._lastLayoutEvent = event
  }

  get lastLayoutEvent() {
    return this._lastLayoutEvent
  }

  private executeAction<
    InputType,
    OutputType = InputType,
    ParamsType extends Rooms.RoomMemberMethodParams = Rooms.RoomMemberMethodParams
  >(
    params: ExecuteMemberActionParams,
    options: ExecuteExtendedOptions<InputType, OutputType, ParamsType> = {}
  ) {
    const { method, channel, memberId, extraParams = {} } = params

    // TODO: fix type
    const targetMember = this.instanceMap.get<RoomSessionMember>(memberId!)
      return this.execute<InputType, OutputType, ParamsType>(
      {
        method,
        params: {
          ...(channel && { channels: [channel] }),
          self:  {
            member_id: this.selfMember?.id,
            call_id: this.selfMember?.callId,
            node_id: this.selfMember?.nodeId,
          },
          target: {
            member_id: targetMember.id,
            call_id: targetMember.callId,
            node_id: targetMember.nodeId,
          },
          ...extraParams,
        },
      },
      options
    )
  }

  audioMute(params: Rooms.RoomMemberMethodParams) {
    return this.executeAction<BaseRPCResult>({
      method: 'call.mute',
      channel: 'audio',
      memberId: params?.memberId,
    })
  }

  audioUnmute(params: Rooms.RoomMemberMethodParams) {
    return this.executeAction<BaseRPCResult>({
      method: 'call.unmute',
      channel: 'audio',
      memberId: params?.memberId,
    })
  }

  videoMute(params: Rooms.RoomMemberMethodParams) {
    return this.executeAction<BaseRPCResult>({
      method: 'call.mute',
      channel: 'video',
      memberId: params?.memberId,
    })
  }

  videoUnmute(params: Rooms.RoomMemberMethodParams) {
    return this.executeAction<BaseRPCResult>({
      method: 'call.unmute',
      channel: 'video',
      memberId: params?.memberId,
    })
  }

  deaf(params: Rooms.RoomMemberMethodParams) {
    return this.executeAction<BaseRPCResult>({
      method: 'call.deaf',
      memberId: params?.memberId,
    })
  }

  undeaf(params: Rooms.RoomMemberMethodParams) {
    return this.executeAction<BaseRPCResult>({
      method: 'call.undeaf',
      memberId: params?.memberId,
    })
  }

  getLayouts() {
    return this.executeAction<{ layouts: string[] }>(
      {
        method: 'call.layout.list',
      },
      {
        transformResolve: (payload) => ({
          layouts: payload.layouts,
        }),
      }
    )
  }

  getMembers() {
    return this.executeAction<{ members: VideoMemberEntity[] }>(
      {
        method: 'call.member.list',
      },
      {
        transformResolve: (payload) => ({
          members: payload.members,
        }),
      }
    )
  }

  removeMember(params: Required<Rooms.RoomMemberMethodParams>) {
    if (!params?.memberId) {
      throw new TypeError('Invalid or missing "memberId" argument')
    }
    return this.executeAction<BaseRPCResult>({
      method: 'call.member.remove',
      memberId: params.memberId,
    })
  }

  setLayout(params: { name: string }) {
    const extraParams = {
      layout: params?.name,
    }
    return this.executeAction<BaseRPCResult>({
      method: 'call.layout.set',
      extraParams,
    })
  }

  setInputVolume(params: MemberCommandWithVolumeParams) {
    return this.executeAction<BaseRPCResult>({
      method: 'call.microphone.volume.set',
      memberId: params?.memberId,
      extraParams: {
        volume: params?.volume,
      },
    })
  }

  setOutputVolume(params: MemberCommandWithVolumeParams) {
    return this.executeAction<BaseRPCResult>({
      method: 'video.member.set_output_volume',
      memberId: params?.memberId,
      extraParams: {
        volume: params?.volume,
      },
    })
  }

  setInputSensitivity(params: MemberCommandWithValueParams) {
    return this.executeAction<BaseRPCResult>({
      method: 'call.microphone.sensitivity.set',
      memberId: params?.memberId,
      extraParams: {
        value: params?.value,
      },
    })
  }
}

export const createCallFabricRoomSessionObject = (
  params: BaseComponentOptions
): CallFabricRoomSession => {
  const room = connect<
    RoomSessionObjectEventsHandlerMapping,
    CallFabricRoomSessionConnection,
    CallFabricRoomSession
  >({
    store: params.store,
    customSagas: params.customSagas,
    Component: CallFabricRoomSessionConnection,
  })(params)

  return room
}
