import {
  BaseComponentOptions,
  BaseRPCResult,
  connect,
  ExecuteExtendedOptions,
  JSONRPCMethod,
  VideoMemberEntity,
  Rooms,
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

interface ExecuteActionParams {
  method: JSONRPCMethod
  extraParams?: Record<string, any>
}

interface ExecuteMemberActionParams extends ExecuteActionParams {
  channel?: 'audio' | 'video'
  memberId?: string
}

export class CallFabricRoomSessionConnection extends RoomSessionConnection {
  protected initWorker() {
    /**
     * The unified eventing or CF worker creates/stores member instances in the instance map
     * For now, the member instances are only required in the CallFabric SDK
     * It also handles `call.*` events
     */
    this.runWorker('callFabricWorker', {
      worker: callFabricWorker,
    })
  }

  get selfMember() {
    return this.callSegments[0]?.member
  }

  get targetMember() {
    return this.callSegments[this.callSegments.length - 1]?.member
  }

  private isSelfMember(id: string) {
    return (
      this.callSegments.findIndex((segment) => segment.memberId === id) > -1
    )
  }

  private executeAction<
    InputType,
    OutputType = InputType,
    ParamsType extends Rooms.RoomMethodParams = Rooms.RoomMethodParams
  >(
    params: ExecuteActionParams,
    options: ExecuteExtendedOptions<InputType, OutputType, ParamsType> = {}
  ) {
    const { method, extraParams = {} } = params

    return this.execute<InputType, OutputType, ParamsType>(
      {
        method,
        params: {
          self: {
            member_id: this.selfMember.id,
            call_id: this.selfMember.callId,
            node_id: this.selfMember.nodeId,
          },
          ...extraParams,
        },
      },
      options
    )
  }

  private executeMemberAction<
    InputType,
    OutputType,
    ParamsType extends Rooms.RoomMemberMethodParams = Rooms.RoomMemberMethodParams
  >(
    params: ExecuteMemberActionParams,
    options: ExecuteExtendedOptions<InputType, OutputType, ParamsType> = {}
  ) {
    const { method, channel, memberId, extraParams = {} } = params

    let targetMember = this.targetMember
    if (memberId && !this.isSelfMember(memberId)) {
      const lastSegment = this.callSegments[this.callSegments.length - 1]
      const memberInCurrentSegment = lastSegment.members.find(
        (member) => member.id === memberId
      )

      if (!memberInCurrentSegment) {
        throw new Error(
          'The memberId is not a part of the current call segment!'
        )
      } else {
        targetMember = memberInCurrentSegment
      }
    }

    return this.execute<InputType, OutputType, ParamsType>(
      {
        method,
        params: {
          ...(channel && { channels: [channel] }),
          self: {
            member_id: this.selfMember.id,
            call_id: this.selfMember.callId,
            node_id: this.selfMember.nodeId,
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
    return this.executeMemberAction<BaseRPCResult, void>({
      method: 'call.mute',
      channel: 'audio',
      memberId: params?.memberId,
    })
  }

  audioUnmute(params: Rooms.RoomMemberMethodParams) {
    return this.executeMemberAction<BaseRPCResult, void>({
      method: 'call.unmute',
      channel: 'audio',
      memberId: params?.memberId,
    })
  }

  videoMute(params: Rooms.RoomMemberMethodParams) {
    return this.executeMemberAction<BaseRPCResult, void>({
      method: 'call.mute',
      channel: 'video',
      memberId: params?.memberId,
    })
  }

  videoUnmute(params: Rooms.RoomMemberMethodParams) {
    return this.executeMemberAction<BaseRPCResult, void>({
      method: 'call.unmute',
      channel: 'video',
      memberId: params?.memberId,
    })
  }

  deaf(params: Rooms.RoomMemberMethodParams) {
    return this.executeMemberAction<BaseRPCResult, void>({
      method: 'call.deaf',
      memberId: params?.memberId,
    })
  }

  undeaf(params: Rooms.RoomMemberMethodParams) {
    return this.executeMemberAction<BaseRPCResult, void>({
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
    return this.executeMemberAction<BaseRPCResult, void>({
      method: 'call.member.remove',
      memberId: params.memberId,
    })
  }

  setLayout(params: Rooms.SetLayoutParams) {
    const extraParams = {
      name: params?.name,
      layout: Object.values(params?.positions || {})[0],
    }
    return this.executeAction<void>({
      method: 'call.layout.set',
      extraParams,
    })
  }

  setInputVolume(params: MemberCommandWithVolumeParams) {
    return this.executeMemberAction<BaseRPCResult, void>({
      method: 'call.microphone.volume.set',
      memberId: params?.memberId,
      extraParams: {
        volume: params?.volume,
      },
    })
  }

  setOutputVolume(params: MemberCommandWithVolumeParams) {
    return this.executeMemberAction<BaseRPCResult, void>({
      method: 'video.member.set_output_volume',
      memberId: params?.memberId,
      extraParams: {
        volume: params?.volume,
      },
    })
  }

  setInputSensitivity(params: MemberCommandWithValueParams) {
    return this.executeMemberAction<BaseRPCResult, void>({
      method: 'call.microphone.sensitivity.set',
      memberId: params?.memberId,
      extraParams: {
        value: params?.value,
      },
    })
  }
}

export const createCallFabricBaseRoomSessionObject = <RoomSessionType>(
  params: BaseComponentOptions
): BaseRoomSession<RoomSessionType> => {
  const room = connect<
    RoomSessionObjectEventsHandlerMapping,
    CallFabricRoomSessionConnection,
    BaseRoomSession<RoomSessionType>
  >({
    store: params.store,
    customSagas: params.customSagas,
    Component: CallFabricRoomSessionConnection,
  })(params)

  return room
}
