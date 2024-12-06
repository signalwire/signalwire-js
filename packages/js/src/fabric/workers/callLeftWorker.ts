import {
  getLogger,
  SagaIterator,
  MapToPubSubShape,
  CallLeftEvent,
  RoomSessionMember,
  Rooms,
} from '@signalwire/core'
import { FabricWorkerParams } from './fabricWorker'

export const callLeftWorker = function* (
  options: FabricWorkerParams<MapToPubSubShape<CallLeftEvent>>
): SagaIterator {
  getLogger().trace('callLeftWorker started')

  const {
    action: { payload },
    instance: cfRoomSession,
    instanceMap,
  } = options

  const { room_session_id } = payload

  // Remove all the member instance where roomSessionId matches
  instanceMap.getAll<RoomSessionMember>().forEach(([key, obj]) => {
    if (
      obj instanceof Rooms.RoomSessionMemberAPI &&
      obj.roomSessionId === room_session_id
    ) {
      instanceMap.remove(key)
    }
  })

  // @ts-expect-error
  cfRoomSession.emit('call.left', payload)

  getLogger().trace('callLeftWorker ended')
}
