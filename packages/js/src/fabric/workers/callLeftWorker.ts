import { getLogger, SagaIterator, CallLeftEvent } from '@signalwire/core'
import { FabricWorkerParams } from './fabricWorker'
import {
  FabricRoomSessionMember,
  FabricRoomSessionMemberAPI,
} from '../FabricRoomSessionMember'

export const callLeftWorker = function* (
  options: FabricWorkerParams<CallLeftEvent>
): SagaIterator {
  getLogger().trace('callLeftWorker started')

  const {
    action: { payload },
    instance: cfRoomSession,
    instanceMap,
  } = options

  const { room_session_id } = payload

  // Remove all the member instance where roomSessionId matches
  instanceMap.getAll<FabricRoomSessionMember>().forEach(([key, obj]) => {
    if (
      obj instanceof FabricRoomSessionMemberAPI &&
      obj.roomSessionId === room_session_id
    ) {
      instanceMap.remove(key)
    }
  })

  cfRoomSession.emit('call.left', payload)
  cfRoomSession.emit('room.left', payload)

  getLogger().trace('callLeftWorker ended')
}
