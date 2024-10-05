import {
  BaseComponentOptions,
  BaseRPCResult,
  connect,
  ExecuteExtendedOptions,
  JSONRPCMethod,
  VideoMemberEntity,
  Rooms,
  VideoLayoutChangedEventParams,
  VideoRoomSubscribedEventParams,
  RoomSessionMember,
  getLogger,
  CallFabricRoomSessionContract,
  VideoLayoutChangedEventParams,
} from '@signalwire/core'
import { BaseRoomSession, RoomSessionConnection } from '../BaseRoomSession'
import { callFabricWorker } from './workers'
import {
  MemberCommandWithVolumeParams,
  MemberCommandWithValueParams,
} from '../video'
import { getStorage } from '../utils/storage'
import { PREVIOUS_CALLID_STORAGE_KEY } from './utils/constants'
import { CallFabricRoomSessionObjectEvents } from '../utils/interfaces'
import { BaseConnectionStateEventTypes } from '@signalwire/webrtc'

interface ExecuteActionParams {
  method: JSONRPCMethod
  extraParams?: Record<string, any>
}

interface ExecuteMemberActionParams extends ExecuteActionParams {
  channel?: 'audio' | 'video'
  memberId?: string
}

type CallFabricBaseRoomSession = Omit<
  BaseRoomSession<
    CallFabricRoomSessionConnection,
    CallFabricRoomSessionObjectEvents
  >,
  'join'
>
export interface CallFabricRoomSession
  extends CallFabricBaseRoomSession,
    CallFabricRoomSessionContract {}

export class CallFabricRoomSessionConnection
  extends RoomSessionConnection<CallFabricRoomSessionObjectEvents>
  implements CallFabricRoomSessionContract
{
  // this is "self" parameter required by the RPC, and is always "the member" on the 1st call segment
  private _self?: RoomSessionMember
  // this is "the member" on the last/active call segment
  private _member?: RoomSessionMember
  private _currentLayoutEvent: VideoLayoutChangedEventParams

  override async hangup(id?: string): Promise<void> {
    this._self = undefined
    this._member = undefined
    const result = await super.hangup(id)
    return result
  }

  get selfMember(): RoomSessionMember | undefined {
    return this._self
  }

  set selfMember(member: RoomSessionMember | undefined) {
    this._self = member
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

  set currentLayoutEvent(event: VideoLayoutChangedEventParams) {
    this._currentLayoutEvent = event
  }

  get currentLayoutEvent() {
    return this._currentLayoutEvent
  }

  get currentLayout() {
    return this._currentLayoutEvent.layout
  }

  // @TODO: Finish this
  get members() {
    return []
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
     * For now, the member instances are only required in the CallFabric SDK
     * It also handles `call.*` events
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

  override async join() {
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

  public setLayout(params: { name: string }) {
    const extraParams = {
      layout: params?.name,
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

export type CallFabricRoomSessionObjectEventsHandlerMapping =
  CallFabricRoomSessionObjectEvents & BaseConnectionStateEventTypes

export const createCallFabricRoomSessionObject = (
  params: BaseComponentOptions
): CallFabricRoomSession => {
  const room = connect<
    CallFabricRoomSessionObjectEventsHandlerMapping,
    CallFabricRoomSessionConnection,
    CallFabricRoomSession
  >({
    store: params.store,
    customSagas: params.customSagas,
    Component: CallFabricRoomSessionConnection,
  })(params)

  return room
}
