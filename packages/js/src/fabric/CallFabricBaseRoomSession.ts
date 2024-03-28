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

  audioMute(params: RoomMemberMethodParams) {
    const { memberId } = params || {}

    const selfMember = this.callSegments[0].member
    let targetMember = this.callSegments[this.callSegments.length - 1].member
    if (memberId) {
      targetMember = this.instanceMap.get<RoomSessionMember>(memberId)
    }

    return this.execute({
      method: 'call.mute',
      params: {
        channels: ['audio'],
        self: {
          member_id: selfMember.id,
          call_id: selfMember.callId,
          node_id: selfMember.nodeId,
        },
        target: {
          member_id: targetMember.id,
          call_id: targetMember.callId,
          node_id: targetMember.nodeId,
        },
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
