import { take } from 'redux-saga/effects'
import { logger, isGlobalEvent } from '../../../utils'
import { getNamespacedEvent } from '../../../utils/EventEmitter'

const findNamespaceInPayload = (payload?: any): string => {
  /**
   * TODO: We should check the event type here
   * At the moment we handle `room_session_id` only
   * but in the future we'll have more APIs (chat/calling/messagging etc.)
   */
  const ns = payload?.room?.room_session_id || payload?.room_session_id

  return ns || ''
}

export function* pubSubSaga({ pubSubChannel, emitter }: any) {
  while (true) {
    const { type, payload } = yield take(pubSubChannel)
    try {
      const namespace = findNamespaceInPayload(payload)

      /**
       * There are events (like `room.started`/`room.ended`) that can
       * be consumed from different places, like from a `roomObj`
       * (namespaced Event Emitter) or from a `client`
       * (non-namespaced/global Event Emitter) so we must trigger the
       * event twice to reach everyone.
       */
      if (isGlobalEvent(type)) {
        emitter.emit(type, payload)
      }

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
