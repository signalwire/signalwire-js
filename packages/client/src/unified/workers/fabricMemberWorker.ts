import {
  CoreMemberUpdatedEventNames,
  SagaIterator,
  fromSnakeToCamelCase,
  getLogger,
  MemberEvent,
  MemberUpdatedEventParams,
} from '@signalwire/core'
import {} from '../../utils/interfaces/fabric'
import { UCallWorkerParams } from './fabricWorker'
import {
  createCallSessionMemberObject,
  CallSessionMember,
} from '../CallSessionMember'

export const fabricMemberWorker = function* (
  options: UCallWorkerParams<MemberEvent>
): SagaIterator {
  getLogger().trace('fabricMemberWorker started')
  const {
    instance: roomSession,
    action: { type, payload },
    instanceMap: { get, set, remove },
  } = options

  const memberId = payload.member.member_id
  let memberInstance = get<CallSessionMember>(memberId)
  if (!memberInstance && type !== 'member.talking') {
    memberInstance = createCallSessionMemberObject({
      store: roomSession.store,
      payload: payload,
    })
  }
  if (memberInstance) {
    memberInstance.setPayload(payload)
  }
  set<CallSessionMember>(memberId, memberInstance)

  if (type.startsWith('member.updated.')) {
    const clientType = fromSnakeToCamelCase(type) as CoreMemberUpdatedEventNames
    roomSession.emit(clientType, payload as MemberUpdatedEventParams)
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
      remove<CallSessionMember>(memberId)
      break
    case 'member.talking':
      roomSession.emit(type, payload)
      break
    default:
      break
  }

  getLogger().trace('fabricMemberWorker ended')
}
