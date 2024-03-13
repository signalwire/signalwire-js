import { BaseComponentOptions, connect, Rooms } from '@signalwire/core'
import {
  BaseRoomSession,
  BaseRoomSessionOptions,
  RoomSessionConnection,
  RoomSessionObjectEventsHandlerMapping,
} from './BaseRoomSession'
import * as workers from './video/workers'
import { unifiedEventsWatcher } from './fabric/workers'

interface RoomMemberMethodParams {
  memberId?: string
}

export class UnifiedRoomSessionConnection extends RoomSessionConnection {
  constructor(options: BaseRoomSessionOptions) {
    super(options)

    this.runWorker('unifiedEventsWatcher', {
      worker: unifiedEventsWatcher,
    })
  }

  protected initWatcher() {
    this.runWorker('videoWorkerUnifiedEventing', {
      worker: workers.videoWorkerUnifiedEventing,
    })
  }

  audioMute(params: RoomMemberMethodParams) {
    const { memberId } = params || {}

    const selfMember = this.instanceMap.get<Rooms.RoomSessionMemberAPI>(
      this.memberId
    )

    let targetMember = selfMember
    if (memberId) {
      targetMember = this.instanceMap.get<Rooms.RoomSessionMemberAPI>(memberId)
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

export const createUnifiedBaseRoomSessionObject = <RoomSessionType>(
  params: BaseComponentOptions
): BaseRoomSession<RoomSessionType> => {
  const room = connect<
    RoomSessionObjectEventsHandlerMapping,
    UnifiedRoomSessionConnection,
    BaseRoomSession<RoomSessionType>
  >({
    store: params.store,
    customSagas: params.customSagas,
    Component: UnifiedRoomSessionConnection,
  })(params)

  return room
}
