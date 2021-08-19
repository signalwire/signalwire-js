import { SagaIterator } from 'redux-saga'
import { take } from '@redux-saga/core/effects'
import { logger, isInternalGlobalEvent } from '../../../utils'
import type { Emitter } from '../../../utils/interfaces'
import { getNamespacedEvent } from '../../../utils/EventEmitter'
import { PubSubChannel, PubSubAction } from '../../interfaces'

type PubSubSagaParams = {
  pubSubChannel: PubSubChannel
  emitter: Emitter
}
const findNamespaceInPayload = (payload?: any): string => {
  /**
   * TODO: We should check the event type here
   * At the moment we handle `room_session_id` only
   * but in the future we'll have more APIs (chat/calling/messagging etc.)
   */
  const ns = payload?.room?.room_session_id || payload?.room_session_id

  return ns || ''
}

export function* pubSubSaga({
  pubSubChannel,
  emitter,
}: PubSubSagaParams): SagaIterator<any> {
  while (true) {
    const { type, payload }: PubSubAction = yield take(pubSubChannel)
    try {
      const namespace = findNamespaceInPayload(payload)
      /**
       * There are events (like `video.room.started`/`video.room.ended`) that can
       * be consumed from different places, like from a `roomObj`
       * (namespaced Event Emitter) or from a `client`
       * (non-namespaced/global Event Emitter) so we must trigger the
       * event twice to reach everyone.
       */
      if (isInternalGlobalEvent(type)) {
        emitter.emit(type, payload)
      }

      emitter.emit(getNamespacedEvent({ namespace, event: type }), payload)
    } catch (error) {
      logger.error(error)
    }
  }
}
