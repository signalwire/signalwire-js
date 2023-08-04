import { ClientEvents } from '@signalwire/js'
import { SagaIterator } from '@redux-saga/core'
import { take, cancelled } from '@redux-saga/core/effects'
import { toInternalEventName, getLogger } from '../../../utils'
import type { EventEmitter } from '../../../utils/EventEmitter'
import type { PubSubChannel, PubSubAction } from '../../interfaces'
import { findNamespaceInPayload } from '../shared/namespace'

type PubSubSagaParams = {
  pubSubChannel: PubSubChannel
  sessionEmitter: EventEmitter<ClientEvents>
}

export function* pubSubSaga({
  pubSubChannel,
  sessionEmitter,
}: PubSubSagaParams): SagaIterator<any> {
  getLogger().debug('pubSubSaga [started]')

  try {
    while (true) {
      const pubSubAction: PubSubAction = yield take(pubSubChannel, '*')
      const { type, payload } = pubSubAction
      try {
        const namespace = findNamespaceInPayload(pubSubAction)

        getLogger().trace(
          'Emit:',
          toInternalEventName<string>({ namespace, event: type })
        )

        sessionEmitter.emit(
          toInternalEventName<string>({
            namespace,
            event: type,
          }) as any,
          payload
        )
      } catch (error) {
        getLogger().error(error)
      }
    }
  } finally {
    if (yield cancelled()) {
      getLogger().debug('pubSubSaga [cancelled]')
    }
  }
}
