import {
  FabricMemberEvent,
  FabricMemberUpdatedEventParams,
  MemberUpdatedEventNames,
  SagaIterator,
  fromSnakeToCamelCase,
  getLogger,
} from '@signalwire/core'
import { FabricWorkerParams } from './fabricWorker'
import {
  createUnifiedCommunicationSessionMemberObject,
  UnifiedCommunicationSessionMember,
} from '../UnifiedCommunicationSessionMember'

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
  let memberInstance = get<UnifiedCommunicationSessionMember>(memberId)
  if (!memberInstance && type !== 'member.talking') {
    memberInstance = createUnifiedCommunicationSessionMemberObject({
      store: roomSession.store,
      payload: payload,
    })
  }
  if (memberInstance) {
    memberInstance.setPayload(payload)
  }
  set<UnifiedCommunicationSessionMember>(memberId, memberInstance)

  if (type.startsWith('member.updated.')) {
    const clientType = fromSnakeToCamelCase(type) as MemberUpdatedEventNames
    roomSession.emit(clientType, payload as FabricMemberUpdatedEventParams)
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
      remove<UnifiedCommunicationSessionMember>(memberId)
      break
    case 'member.talking':
      roomSession.emit(type, payload)
      break
    default:
      break
  }

  getLogger().trace('fabricMemberWorker ended')
}
