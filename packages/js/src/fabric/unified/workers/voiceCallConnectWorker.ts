import {
  getLogger,
  sagaEffects,
  SagaIterator,
  SDKActions,
  SDKWorker,
} from '@signalwire/core'
import type { Client } from '../../../Client'

import { handleCallConnectEvents } from './handlers/callConnectEventsHandler'
import { handleCallStateEvents } from './handlers/callStateEventsHandler'

export const voiceCallConnectWorker: SDKWorker<Client> = function* (
  options
): SagaIterator {
  getLogger().trace('voiceCallConnectWorker started')
  getLogger().debug('voiceCallConnectWorker started')
  console.log('voiceCallConnectWorker started')
  const {
    channels: { swEventChannel },
    instance,
  } = options

  const isCallConnectEvent = (action: SDKActions) =>
    //@ts-ignore
    action.type === 'video.room.connect'

  const isCallStateEvent = (action: SDKActions) =>
    //@ts-ignore
    action.type === 'video.room.state'

  function* callConnectWatcher(): SagaIterator {
    while (true) {
      const action = yield sagaEffects.take(swEventChannel, isCallConnectEvent)
      getLogger().debug(`>>>>> voiceCallConnectWorker handling`, action)
      const shouldStop = handleCallConnectEvents({
        payload: action.payload,
        instance,
      })

      if (shouldStop) break
    }
  }

  function* callStateWatcher(): SagaIterator {
    while (true) {
      const action = yield sagaEffects.take(swEventChannel, isCallStateEvent)

      const shouldStop = handleCallStateEvents({
        payload: action.payload,
        instance,
      })

      if (shouldStop) break
    }
  }

  yield sagaEffects.fork(callConnectWatcher)
  yield sagaEffects.fork(callStateWatcher)

  getLogger().trace('voiceCallConnectWorker ended')
}
