import { getLogger, SagaIterator, CallLeftEvent } from '@signalwire/core'
import { CallWorkerParams } from './fabricWorker'
import { CallSessionMemberAPI } from '../CallSessionMember'

export const callLeftWorker = function* (
  options: CallWorkerParams<CallLeftEvent>
): SagaIterator {
  getLogger().trace('callLeftWorker started')

  const {
    action: { payload },
    instance: callSession,
    instanceMap,
  } = options

  const { room_session_id } = payload

  // Remove all the member instance where roomSessionId matches
  instanceMap.getAll().forEach(([key, obj]) => {
    if (
      obj instanceof CallSessionMemberAPI &&
      obj.roomSessionId === room_session_id
    ) {
      instanceMap.remove(key)
    }
  })

  callSession.emit('call.left', payload)
  callSession.emit('room.left', payload)

  getLogger().trace('callLeftWorker ended')
}
