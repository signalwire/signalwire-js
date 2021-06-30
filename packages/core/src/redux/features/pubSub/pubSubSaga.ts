import { take } from 'redux-saga/effects'
import { logger } from '../../../utils'
import { getNamespacedEvent } from '../../../utils/EventEmitter'

const findNamespaceInPayload = (payload?: any): string => {
  // TODO: Validate if this list is exhaustive
  // Also: what's the difference between `call_id` and `payload?.member.room_id`
  const ns = payload?.call_id || payload?.member?.id

  return ns || ''
}

export function* pubSubSaga({ pubSubChannel, emitter }: any) {
  while (true) {
    const { type, payload } = yield take(pubSubChannel)
    try {
      // TODO: with this we're missing out `layout` events since we
      // don't have a way to get a reference to the call id
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
