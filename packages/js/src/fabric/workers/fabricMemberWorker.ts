import { FabricMemberEvent, SagaIterator, getLogger } from '@signalwire/core'
import { FabricWorkerParams } from './fabricWorker'
import {
  createFabricRoomSessionMemberObject,
  FabricRoomSessionMember,
} from '../FabricRoomSessionMember'

export const fabricMemberWorker = function* (
  options: FabricWorkerParams<FabricMemberEvent>
): SagaIterator {
  getLogger().trace('fabricMemberWorker started')
  const {
    instance: roomSession,
    action: { type, payload },
    instanceMap: { get, set, remove },
  } = options

  const memberId = payload.member.member_id
  if (type !== 'member.talking') {
    let memberInstance = get<FabricRoomSessionMember>(memberId)
    if (!memberInstance) {
      memberInstance = createFabricRoomSessionMemberObject({
        store: roomSession.store,
        payload: payload,
      })
    } else {
      memberInstance.setPayload(payload)
    }
    set<FabricRoomSessionMember>(memberId, memberInstance)
  }

  if (type.startsWith('member.updated.')) {
    roomSession.emit(type, payload)
  }

  switch (type) {
    case 'member.joined':
      roomSession.emit(type, payload)
      break
    case 'member.updated':
      roomSession.emit(type, payload)
      break
    case 'member.left':
      roomSession.emit(type, payload)
      remove<FabricRoomSessionMember>(memberId)
      break
    case 'member.talking':
      roomSession.emit(type, payload)
      break
    default:
      break
  }

  getLogger().trace('fabricMemberWorker ended')
}
