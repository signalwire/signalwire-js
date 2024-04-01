import {
  BaseComponentOptions,
  connect,
  RoomSessionMember,
} from '@signalwire/core'
import {
  BaseRoomSession,
  RoomSessionConnection,
  RoomSessionObjectEventsHandlerMapping,
} from '../BaseRoomSession'
import { callFabricWorker } from './workers'

interface RoomMemberMethodParams {
  memberId?: string
}

export class CallFabricRoomSessionConnection extends RoomSessionConnection {
  protected initWorker() {
    /**
     * The unified eventing or cf worker creates/stores member instances in the instance map
     * For now, the member instances are only required in the CallFabric SDK
     * It also handles call. events
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

  private executeMemberAction({
    actionType,
    channel,
    memberId,
  }: {
    actionType: 'call.mute' | 'call.unmute'
    channel: 'audio' | 'video'
    memberId?: string
  }) {
    let targetMember = memberId
      ? this.instanceMap.get<RoomSessionMember>(memberId)
      : this.targetMember

    return this.execute({
      method: actionType,
      params: {
        channels: [channel],
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
      },
    })
  }

  audioMute(params: RoomMemberMethodParams) {
    return this.executeMemberAction({
      actionType: 'call.mute',
      channel: 'audio',
      memberId: params?.memberId,
    })
  }

  audioUnmute(params: RoomMemberMethodParams) {
    return this.executeMemberAction({
      actionType: 'call.unmute',
      channel: 'audio',
      memberId: params?.memberId,
    })
  }

  videoMute(params: RoomMemberMethodParams) {
    return this.executeMemberAction({
      actionType: 'call.mute',
      channel: 'video',
      memberId: params?.memberId,
    })
  }

  videoUnmute(params: RoomMemberMethodParams) {
    return this.executeMemberAction({
      actionType: 'call.unmute',
      channel: 'video',
      memberId: params?.memberId,
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
