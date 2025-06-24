import {
  connect,
  BaseComponentContract,
  BaseRPCResult,
  FabricLayoutChangedEventParams,
  ExecuteExtendedOptions,
  Rooms,
  VideoMemberEntity,
  VideoPosition,
  BaseConnectionContract,
  FabricRoomSessionMethods,
  MemberCommandParams,
  MemberCommandWithVolumeParams,
  MemberCommandWithValueParams,
} from '@signalwire/core'
import {
  BaseRoomSessionConnection,
  BaseRoomSessionOptions,
} from '@signalwire/browser-common'
import {
  BaseRoomSessionContract,
  ExecuteMemberActionParams,
  CallSessionContract,
  CallSessionEvents,
  RequestMemberParams,
} from './utils/interfaces'
import { getStorage } from '@signalwire/browser-common'
import { PREVIOUS_CALLID_STORAGE_KEY } from './utils/constants'
import { fabricWorker } from './workers'
import { CallSessionMember } from './CallSessionMember'
import { makeAudioElementSaga } from './features/mediaElements/mediaElementsSagas'
import { CallCapabilitiesContract } from './interfaces/capabilities'
import { createCallSessionValidateProxy } from './utils/validationProxy'

export interface CallSession
  extends CallSessionContract,
    FabricRoomSessionMethods,
    BaseRoomSessionContract,
    BaseConnectionContract<CallSessionEvents>,
    BaseComponentContract {}

export interface CallSessionOptions
  extends Omit<BaseRoomSessionOptions, 'customSagas'> {}

export class CallSessionConnection
  extends BaseRoomSessionConnection<CallSessionEvents>
  implements CallSessionContract
{
  // this is "self" parameter required by the RPC, and is always "the member" on the 1st call segment
  private _self?: CallSessionMember
  // this is "the member" on the last/active call segment
  private _member?: CallSessionMember
  private _currentLayoutEvent: FabricLayoutChangedEventParams
  //describes what are methods are allow for the user in a call segment
  private _capabilities?: CallCapabilitiesContract

  constructor(options: CallSessionOptions) {
    super(options)

    this.initWorker()
  }

  override get memberId() {
    return this._member?.memberId
  }

  override dialogParams(rtcPeerId: string) {
    const params = super.dialogParams(rtcPeerId)
    params.dialogParams.attach = this.options.attach || this.resuming
    params.dialogParams.reattaching = this.options.attach || this.resuming
    return params
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

  get capabilities(): CallCapabilitiesContract | undefined {
    return this._capabilities
  }

  set capabilities(capabilities: CallCapabilitiesContract | undefined) {
    this._capabilities = capabilities
  }

  get selfMember(): CallSessionMember | undefined {
    return this._self
  }

  set selfMember(member: CallSessionMember | undefined) {
    this._self = member
  }

  set member(member: CallSessionMember) {
    this._member = member
  }

  get member(): CallSessionMember {
    return this._member!
  }

  private initWorker() {
    this.runWorker('fabricWorker', {
      worker: fabricWorker,
    })

    /**
     * By default the SDK attaches the audio to
     * an Audio element (regardless of "rootElement")
     */
    this.runWorker('makeAudioElement', {
      worker: makeAudioElementSaga({
        speakerId: this.options.speakerId,
      }),
    })
  }

  private async join() {
    if (this.options.attach) {
      this.options.prevCallId =
        getStorage()?.getItem(PREVIOUS_CALLID_STORAGE_KEY) ?? undefined
    }
    this.logger.debug(
      `Tying to reattach to previuos call? ${!!this.options
        .prevCallId} - prevCallId: ${this.options.prevCallId}`
    )

    return super.invite<CallSession>()
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
      ? this.instanceMap.get<CallSessionMember>(memberId)
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
        // should not resume when selfMember is defined (the SDK didn't lost its state since the `call.joined` was received)
        this.resuming = !this.selfMember
        this.peer.restartIce()
      }
    }
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

  public async audioMute(params?: MemberCommandParams) {
    return this.executeAction<BaseRPCResult>({
      method: 'call.mute',
      channel: 'audio',
      memberId: params?.memberId,
    })
  }

  public async audioUnmute(params?: MemberCommandParams) {
    return this.executeAction<BaseRPCResult>({
      method: 'call.unmute',
      channel: 'audio',
      memberId: params?.memberId,
    })
  }

  public async videoMute(params?: MemberCommandParams) {
    return this.executeAction<BaseRPCResult>({
      method: 'call.mute',
      channel: 'video',
      memberId: params?.memberId,
    })
  }

  public async videoUnmute(params?: MemberCommandParams) {
    return this.executeAction<BaseRPCResult>({
      method: 'call.unmute',
      channel: 'video',
      memberId: params?.memberId,
    })
  }

  public async deaf(params?: MemberCommandParams) {
    return this.executeAction<BaseRPCResult>({
      method: 'call.deaf',
      memberId: params?.memberId,
    })
  }

  public async undeaf(params?: MemberCommandParams) {
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
    return this.executeAction<BaseRPCResult>({
      method: 'call.member.remove',
      memberId: params.memberId,
    })
  }

  public async setRaisedHand(params?: Rooms.SetRaisedHandRoomParams) {
    const { raised = true, memberId } = params || {}
    return this.executeAction<BaseRPCResult>({
      method: raised ? 'call.raisehand' : 'call.lowerhand',
      memberId,
    })
  }

  public async setLayout(params: Rooms.SetLayoutParams) {
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
    return this.executeAction<BaseRPCResult>({
      method: 'call.microphone.volume.set',
      memberId: params.memberId,
      extraParams: {
        volume: params.volume,
      },
    })
  }

  public async setOutputVolume(params: MemberCommandWithVolumeParams) {
    return this.executeAction<BaseRPCResult>({
      method: 'call.speaker.volume.set',
      memberId: params.memberId,
      extraParams: {
        volume: params.volume,
      },
    })
  }

  public async setInputSensitivity(params: MemberCommandWithValueParams) {
    return this.executeAction<BaseRPCResult>({
      method: 'call.microphone.sensitivity.set',
      memberId: params.memberId,
      extraParams: {
        sensitivity: params.value,
      },
    })
  }

  public async setPositions(params: Rooms.SetPositionsParams) {
    const targets: {
      target: RequestMemberParams
      position: VideoPosition
    }[] = []

    Object.entries(params.positions).forEach(([key, value]) => {
      const targetMember =
        key === 'self'
          ? this.member
          : this.instanceMap.get<CallSessionMember>(key)

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
    return this.executeAction<BaseRPCResult>({
      method: 'call.lock',
    })
  }

  public async unlock() {
    return this.executeAction<BaseRPCResult>({
      method: 'call.unlock',
    })
  }
}

export const isCallSession = (
  room: unknown
): room is CallSession => {
  return room instanceof CallSessionConnection
}

/** @internal */
export const createCallSessionObject = (
  params: CallSessionOptions
): CallSession => {
  const room = connect<
    CallSessionEvents,
    CallSessionConnection,
    CallSession
  >({
    store: params.store,
    Component: CallSessionConnection,
  })(params)

  return createCallSessionValidateProxy(room)
}

// Export the factory function as CallSession for the public API
export { createCallSessionObject as CallSession }
