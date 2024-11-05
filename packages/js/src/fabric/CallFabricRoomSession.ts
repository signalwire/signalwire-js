import {
  BaseComponentOptions,
  BaseRPCResult,
  connect,
  ExecuteExtendedOptions,
  JSONRPCMethod,
  VideoMemberEntity,
  Rooms,
  VideoRoomSubscribedEventParams,
  RoomSessionMember,
  getLogger,
  VideoLayoutChangedEventParams,
  VideoPosition,
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
import { getStorage } from '../utils/storage'
import { PREVIOUS_CALLID_STORAGE_KEY } from './utils/constants'
import { CallFabricRoomSessionContract } from '../utils/interfaces'

interface ExecuteActionParams {
  method: JSONRPCMethod
  extraParams?: Record<string, any>
}

interface ExecuteMemberActionParams extends ExecuteActionParams {
  channel?: 'audio' | 'video'
  memberId?: string
}

interface RequestMemberParams {
  node_id: string
  member_id: string
  call_id: string
}

type CallFabricBaseRoomSession = Omit<
  BaseRoomSession<CallFabricRoomSession>,
  'join'
>

export interface CallFabricRoomSession
  extends CallFabricRoomSessionContract,
    CallFabricBaseRoomSession {}

export class CallFabricRoomSessionConnection extends RoomSessionConnection {
  // this is "self" parameter required by the RPC, and is always "the member" on the 1st call segment
  private _self?: RoomSessionMember
  // this is "the member" on the last/active call segment
  private _member?: RoomSessionMember
  private _lastLayoutEvent: VideoLayoutChangedEventParams

  override async hangup(id?: string): Promise<void> {
    this._self = undefined
    this._member = undefined
    const result = await super.hangup(id)
    return result
  }

  set selfMember(member: RoomSessionMember | undefined) {
    this._self = member
  }

  get selfMember(): RoomSessionMember | undefined {
    return this._self
  }

  set member(member: RoomSessionMember) {
    this._member = member
  }

  get member(): RoomSessionMember {
    return this._member!
  }

  override get memberId() {
    return this._member?.memberId
  }

  set lastLayoutEvent(event: VideoLayoutChangedEventParams) {
    this._lastLayoutEvent = event
  }

  get lastLayoutEvent() {
    return this._lastLayoutEvent
  }

  get currentLayout() {
    return this._lastLayoutEvent?.layout
  }

  get currentPosition() {
    return this._lastLayoutEvent?.layout.layers.find(
      (layer) => layer.member_id === this.memberId
    )?.position
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

    const targetMember = memberId
      ? this.instanceMap.get<RoomSessionMember>(memberId)
      : this.member
    if (!targetMember) throw new Error('No target param found to execute')

    return this.execute<InputType, OutputType, ParamsType>(
      {
        method,
        params: {
          ...(channel && { channels: [channel] }),
          self: {
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

  protected override initWorker() {
    /**
     * The unified eventing or CallFabric worker creates/stores member instances in the instance map
     * For now, the member instances are only required in the CallFabric SDK.
     */
    this.runWorker('callFabricWorker', {
      worker: callFabricWorker,
    })
  }

  public async start() {
    return new Promise<void>(async (resolve, reject) => {
      try {
        this.once(
          'room.subscribed',
          ({ call_id }: VideoRoomSubscribedEventParams) => {
            getStorage()?.setItem(PREVIOUS_CALLID_STORAGE_KEY, call_id)
            resolve()
          }
        )

        this.once('destroy', () => {
          getStorage()?.removeItem(PREVIOUS_CALLID_STORAGE_KEY)
        })

        await this.join()
      } catch (error) {
        this.logger.error('WSClient call start', error)
        reject(error)
      }
    })
  }

  /** @internal */
  public override async join() {
    if (this.options.attach) {
      this.options.prevCallId =
        getStorage()?.getItem(PREVIOUS_CALLID_STORAGE_KEY) ?? undefined
    }
    getLogger().debug(
      `Tying to reattach to previuos call? ${!!this.options
        .prevCallId} - prevCallId: ${this.options.prevCallId}`
    )

    return super.join()
  }

  /** @internal */
  public override async resume() {
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

  public audioMute(params: Rooms.RoomMemberMethodParams) {
    return this.executeAction<BaseRPCResult>({
      method: 'call.mute',
      channel: 'audio',
      memberId: params?.memberId,
    })
  }

  public audioUnmute(params: Rooms.RoomMemberMethodParams) {
    return this.executeAction<BaseRPCResult>({
      method: 'call.unmute',
      channel: 'audio',
      memberId: params?.memberId,
    })
  }

  public videoMute(params: Rooms.RoomMemberMethodParams) {
    return this.executeAction<BaseRPCResult>({
      method: 'call.mute',
      channel: 'video',
      memberId: params?.memberId,
    })
  }

  public videoUnmute(params: Rooms.RoomMemberMethodParams) {
    return this.executeAction<BaseRPCResult>({
      method: 'call.unmute',
      channel: 'video',
      memberId: params?.memberId,
    })
  }

  public deaf(params: Rooms.RoomMemberMethodParams) {
    return this.executeAction<BaseRPCResult>({
      method: 'call.deaf',
      memberId: params?.memberId,
    })
  }

  public undeaf(params: Rooms.RoomMemberMethodParams) {
    return this.executeAction<BaseRPCResult>({
      method: 'call.undeaf',
      memberId: params?.memberId,
    })
  }

  public getLayouts() {
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

  public getMembers() {
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

  public removeMember(params: Required<Rooms.RoomMemberMethodParams>) {
    if (!params?.memberId) {
      throw new TypeError('Invalid or missing "memberId" argument')
    }
    return this.executeAction<BaseRPCResult>({
      method: 'call.member.remove',
      memberId: params.memberId,
    })
  }

  public setRaisedHand(params?: Rooms.SetRaisedHandRoomParams) {
    const { raised = true, memberId } = params || {}
    return this.executeAction<BaseRPCResult>({
      method: raised ? 'call.raisehand' : 'call.lowerhand',
      memberId,
    })
  }

  public setLayout(params: Rooms.SetLayoutParams) {
    const extraParams = {
      layout: params.name,
      positions: params.positions,
    }
    return this.executeAction<BaseRPCResult>({
      method: 'call.layout.set',
      extraParams,
    })
  }

  public setInputVolume(params: MemberCommandWithVolumeParams) {
    return this.executeAction<BaseRPCResult>({
      method: 'call.microphone.volume.set',
      memberId: params?.memberId,
      extraParams: {
        volume: params?.volume,
      },
    })
  }

  public setOutputVolume(params: MemberCommandWithVolumeParams) {
    return this.executeAction<BaseRPCResult>({
      method: 'video.member.set_output_volume',
      memberId: params?.memberId,
      extraParams: {
        volume: params?.volume,
      },
    })
  }

  public setInputSensitivity(params: MemberCommandWithValueParams) {
    return this.executeAction<BaseRPCResult>({
      method: 'call.microphone.sensitivity.set',
      memberId: params?.memberId,
      extraParams: {
        value: params?.value,
      },
    })
  }

  public setPositions(params: Rooms.SetPositionsParams) {
    const positions = params.positions

    if (positions && !Object.keys(positions).length) {
      throw new Error('Invalid positions')
    }

    const targets: {
      target: RequestMemberParams
      position: VideoPosition
    }[] = []

    Object.entries(positions).forEach(([key, value]) => {
      const targetMember =
        key === 'self'
          ? this.member
          : this.instanceMap.get<RoomSessionMember>(key)

      if (targetMember) {
        targets.push({
          target: {
            member_id: targetMember.id,
            call_id: targetMember.callId!,
            node_id: targetMember.nodeId!,
          },
          position: value,
        })
      }
    })

    if (!targets.length) {
      throw new Error('Invalid targets')
    }

    return this.execute({
      method: 'call.member.position.set',
      params: {
        self: {
          member_id: this.selfMember?.id,
          call_id: this.selfMember?.callId,
          node_id: this.selfMember?.nodeId,
        },
        targets,
      },
    })
  }

  public lock() {
    return this.executeAction<BaseRPCResult>({
      method: 'call.lock',
    })
  }

  public unlock() {
    return this.executeAction<BaseRPCResult>({
      method: 'call.unlock',
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
