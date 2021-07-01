import { take } from 'redux-saga/effects'
import { logger } from '../../../utils'
import { getNamespacedEvent } from '../../../utils/EventEmitter'

const findNamespaceInPayload = (payload?: any): string => {
  // TODO: Validate if this list is exhaustive
  const ns =
    payload?.room?.room_session_id ||
    payload?.member?.room_session_id ||
    payload?.layout?.room_session_id

  return ns || ''
}

export function* pubSubSaga({ pubSubChannel, emitter }: any) {
  while (true) {
    const { type, payload } = yield take(pubSubChannel)
    try {
      const namespace = findNamespaceInPayload(payload)

      emitter.emit(
        getNamespacedEvent({
          namespace,
          event: type,
        }),
        payload
      )
    } catch (error) {
      logger.error(error)
    }
  }
}
