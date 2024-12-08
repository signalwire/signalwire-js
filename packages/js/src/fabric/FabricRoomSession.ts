import {
  connect,
  BaseComponentContract,
  BaseRPCResult,
  CallCapabilities,
  FabricLayoutChangedEventParams,
  ExecuteExtendedOptions,
  Rooms,
  VideoMemberEntity,
  VideoPosition,
  BaseConnectionContract,
  FabricRoomSessionMethods,
  MemberCommandParams,
} from '@signalwire/core'
import {
  BaseRoomSessionConnection,
  BaseRoomSessionOptions,
} from '../BaseRoomSession'
import {
  BaseRoomSessionContract,
  ExecuteMemberActionParams,
  FabricRoomSessionContract,
  FabricRoomSessionEvents,
  MemberCommandWithValueParams,
  MemberCommandWithVolumeParams,
  RequestMemberParams,
} from '../utils/interfaces'
import { getStorage } from '../utils/storage'
import { PREVIOUS_CALLID_STORAGE_KEY } from './utils/constants'
import { fabricWorker } from './workers'
import { FabricRoomSessionMember } from './FabricRoomSessionMember'

export interface FabricRoomSession
  extends FabricRoomSessionContract,
    FabricRoomSessionMethods,
    BaseRoomSessionContract,
    BaseConnectionContract<FabricRoomSessionEvents>,
    BaseComponentContract {}

export interface FabricRoomSessionOptions extends BaseRoomSessionOptions {}

export class FabricRoomSessionConnection
  extends BaseRoomSessionConnection<FabricRoomSessionEvents>
  implements FabricRoomSessionContract
{
  // this is "self" parameter required by the RPC, and is always "the member" on the 1st call segment
  private _self?: FabricRoomSessionMember
  // this is "the member" on the last/active call segment
  private _member?: FabricRoomSessionMember
  private _currentLayoutEvent: FabricLayoutChangedEventParams
  //describes what are methods are allow for the user in a call segment
  private _capabilities: CallCapabilities = {}

  constructor(options: FabricRoomSessionOptions) {
    super(options)

    this.initWorker()
  }

  override get memberId() {
    return this._member?.memberId
  }

  set currentLayoutEvent(event: FabricLayoutChangedEventParams) {
    this._currentLayoutEvent = event
  }

  get currentLayoutEvent() {
    return this._currentLayoutEvent
  }

  get currentLayout() {
    return this._currentLayoutEvent?.layout
  }

  get currentPosition() {
    return this._currentLayoutEvent?.layout.layers.find(
      (layer) => layer.member_id === this.memberId
    )?.position
  }

  get capabilities(): CallCapabilities {
    return this._capabilities
  }

  set capabilities(capabilities: CallCapabilities) {
    this._capabilities = capabilities
  }

  get selfMember(): FabricRoomSessionMember | undefined {
    return this._self
  }

  set selfMember(member: FabricRoomSessionMember | undefined) {
    this._self = member
  }

  set member(member: FabricRoomSessionMember) {
    this._member = member
  }

  get member(): FabricRoomSessionMember {
    return this._member!
  }

  // @TODO: Finish this
  get members() {
    return []
  }

  private initWorker() {
    this.runWorker('fabricWorker', {
      worker: fabricWorker,
    })
  }

  private executeAction<
    InputType,
    OutputType = InputType,
    ParamsType extends MemberCommandParams = MemberCommandParams
  >(
    params: ExecuteMemberActionParams,
    options: ExecuteExtendedOptions<InputType, OutputType, ParamsType> = {}
  ) {
    const { method, channel, memberId, extraParams = {} } = params

    const targetMember = memberId
      ? this.instanceMap.get<FabricRoomSessionMember>(memberId)
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

  /** @internal */
  public async join() {
    if (this.options.attach) {
      this.options.prevCallId =
        getStorage()?.getItem(PREVIOUS_CALLID_STORAGE_KEY) ?? undefined
    }
    this.logger.debug(
      `Tying to reattach to previuos call? ${!!this.options
        .prevCallId} - prevCallId: ${this.options.prevCallId}`
    )

    return super.invite<this>()
  }

  public async start() {
    return new Promise<void>(async (resolve, reject) => {
      try {
        this.once('room.subscribed', (params) => {
          getStorage()?.setItem(PREVIOUS_CALLID_STORAGE_KEY, params.call_id)
          resolve()
        })

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

  public async audioMute(params: MemberCommandParams) {
    if (
      !params || params.memberId === this.member.id
        ? !this.capabilities.self?.muteAudio?.off
        : !this.capabilities.member?.muteAudio?.off
    ) {
      throw Error('Missing audio mute capability')
    }
    return this.executeAction<BaseRPCResult>({
      method: 'call.mute',
      channel: 'audio',
      memberId: params?.memberId,
    })
  }

  public async audioUnmute(params: MemberCommandParams) {
    if (
      !params || params.memberId === this.member.id
        ? !this.capabilities.self?.muteAudio?.on
        : !this.capabilities.member?.muteAudio?.on
    ) {
      throw Error('Missing audio unmute capability')
    }
    return this.executeAction<BaseRPCResult>({
      method: 'call.unmute',
      channel: 'audio',
      memberId: params?.memberId,
    })
  }

  public async videoMute(params: MemberCommandParams) {
    if (
      !params || params.memberId === this.member.id
        ? !this.capabilities.self?.muteVideo?.off
        : !this.capabilities.member?.muteVideo?.on
    ) {
      throw Error('Missing video mute capability')
    }
    return this.executeAction<BaseRPCResult>({
      method: 'call.mute',
      channel: 'video',
      memberId: params?.memberId,
    })
  }

  public async videoUnmute(params: MemberCommandParams) {
    if (
      !params || params.memberId === this.member.id
        ? !this.capabilities.self?.muteVideo?.on
        : !this.capabilities.member?.muteVideo?.on
    ) {
      throw Error('Missing video unmute capability')
    }
    return this.executeAction<BaseRPCResult>({
      method: 'call.unmute',
      channel: 'video',
      memberId: params?.memberId,
    })
  }

  public async deaf(params: MemberCommandParams) {
    if (
      !params || params.memberId === this.member.id
        ? !this.capabilities.self?.deaf?.on
        : !this.capabilities.member?.deaf?.on
    ) {
      throw Error('Missing deaf capability')
    }
    return this.executeAction<BaseRPCResult>({
      method: 'call.deaf',
      memberId: params?.memberId,
    })
  }

  public async undeaf(params: MemberCommandParams) {
    if (
      !params || params.memberId === this.member.id
        ? !this.capabilities.self?.deaf?.off
        : !this.capabilities.member?.deaf?.off
    ) {
      throw Error('Missing undeaf capability')
    }
    return this.executeAction<BaseRPCResult>({
      method: 'call.undeaf',
      memberId: params?.memberId,
    })
  }

  public async getLayouts() {
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

  public async getMembers() {
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

  public async removeMember(params: Required<MemberCommandParams>) {
    if (!this.capabilities.member?.remove) {
      throw Error('Missing setLayout capability')
    }
    if (!params?.memberId) {
      throw new TypeError('Invalid or missing "memberId" argument')
    }
    return this.executeAction<BaseRPCResult>({
      method: 'call.member.remove',
      memberId: params.memberId,
    })
  }

  public async setRaisedHand(params?: Rooms.SetRaisedHandRoomParams) {
    const { raised = true, memberId } = params || {}
    if (
      memberId == this.member.id && raised
        ? !this.capabilities.self?.raisehand?.on
        : !this.capabilities.member?.raisehand?.on
    ) {
      throw Error('Missing raisehand capability')
    }
    if (
      memberId == this.member.id && !raised
        ? !this.capabilities.self?.raisehand?.off
        : !this.capabilities.member?.raisehand?.off
    ) {
      throw Error('Missing lowerhand capability')
    }
    return this.executeAction<BaseRPCResult>({
      method: raised ? 'call.raisehand' : 'call.lowerhand',
      memberId,
    })
  }

  public async setLayout(params: Rooms.SetLayoutParams) {
    if (!this.capabilities.setLayout) {
      throw Error('Missing setLayout capability')
    }
    const extraParams = {
      layout: params.name,
      positions: params.positions,
    }
    return this.executeAction<BaseRPCResult>({
      method: 'call.layout.set',
      extraParams,
    })
  }

  public async setInputVolume(params: MemberCommandWithVolumeParams) {
    if (
      !params || params.memberId === this.member.id
        ? !this.capabilities.self?.microphoneVolume
        : !this.capabilities.member?.microphoneVolume
    ) {
      throw Error('Missing setInputVolume capability')
    }
    return this.executeAction<BaseRPCResult>({
      method: 'call.microphone.volume.set',
      memberId: params?.memberId,
      extraParams: {
        volume: params?.volume,
      },
    })
  }

  public async setOutputVolume(params: MemberCommandWithVolumeParams) {
    if (
      !params || params.memberId === this.member.id
        ? !this.capabilities.self?.speakerVolume
        : !this.capabilities.member?.speakerVolume
    ) {
      throw Error('Missing setOutputVolume capability')
    }
    return this.executeAction<BaseRPCResult>({
      method: 'video.member.set_output_volume',
      memberId: params?.memberId,
      extraParams: {
        volume: params?.volume,
      },
    })
  }

  public async setInputSensitivity(params: MemberCommandWithValueParams) {
    if (
      !params || params.memberId === this.member.id
        ? !this.capabilities.self?.microphoneSensitivity
        : !this.capabilities.member?.microphoneSensitivity
    ) {
      throw Error('Missing setOutputVolume capability')
    }
    return this.executeAction<BaseRPCResult>({
      method: 'call.microphone.sensitivity.set',
      memberId: params?.memberId,
      extraParams: {
        value: params?.value,
      },
    })
  }

  public async setPositions(params: Rooms.SetPositionsParams) {
    const positions = params.positions

    if (positions && !Object.keys(positions).length) {
      throw new Error('Invalid positions')
    }

    if (
      Object.keys(positions).some((p) =>
        ['self', `${this.memberId}`].includes(p)
      )
        ? !this.capabilities.self?.position
        : !this.capabilities.member?.position
    ) {
      throw Error('Missing setPositions capability')
    }

    const targets: {
      target: RequestMemberParams
      position: VideoPosition
    }[] = []

    Object.entries(positions).forEach(([key, value]) => {
      const targetMember =
        key === 'self'
          ? this.member
          : this.instanceMap.get<FabricRoomSessionMember>(key)

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

  public async lock() {
    if (!this.capabilities.lock?.on) {
      throw Error('Missing lock capability')
    }
    return this.executeAction<BaseRPCResult>({
      method: 'call.lock',
    })
  }

  public async unlock() {
    if (!this.capabilities.lock?.off) {
      throw Error('Missing unlock capability')
    }
    return this.executeAction<BaseRPCResult>({
      method: 'call.unlock',
    })
  }
}

/** @internal */
export const createFabricRoomSessionObject = (
  params: FabricRoomSessionOptions
): FabricRoomSession => {
  const room = connect<
    FabricRoomSessionEvents,
    FabricRoomSessionConnection,
    FabricRoomSession
  >({
    store: params.store,
    customSagas: params.customSagas,
    Component: FabricRoomSessionConnection,
  })(params)

  return room
}
