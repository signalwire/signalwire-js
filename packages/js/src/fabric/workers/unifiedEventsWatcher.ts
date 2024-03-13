import {
  MapToPubSubShape,
  SDKActions,
  SDKWorker,
  SagaIterator,
  VideoAPIEventParams,
  getLogger,
  sagaEffects,
  SDKWorkerParams,
  SwEventChannel,
  PubSubAction,
  isMappableObject,
} from '@signalwire/core'
import { RoomSessionConnection } from '../../BaseRoomSession'
import { fromUnifiedEvent } from './mappers/unifiedEventsMapper'
// import { unifiedTargetWorker } from './unifiedTargetWorker'

export type VideoWorkerParams<T> = SDKWorkerParams<RoomSessionConnection> & {
  action: T
}

function* eventMapperWorker({
  action,
  swEventChannel,
}: {
  action: PubSubAction
  swEventChannel: SwEventChannel
}) {
  if (isMappableObject(action)) {
    const mappedActions = fromUnifiedEvent(action)
    for (const mappedAction of mappedActions) {
      // @ts-expect-error
      yield sagaEffects.put(swEventChannel, mappedAction)
    }
  }
}

export const unifiedEventsWatcher: SDKWorker<RoomSessionConnection> =
  function* (options): SagaIterator {
    const {
      channels: { swEventChannel },
    } = options

    getLogger().debug('unifiedEventsWatcher started')

    function* worker(action: any) {
      yield sagaEffects.fork(eventMapperWorker, {
        ...options,
        action,
        swEventChannel,
      })

      // // @ts-expect-error FIX ME
      // yield sagaEffects.fork(unifiedTargetWorker, {
      //   ...options,
      //   action,
      // })
    }

    const isUnifiedEvent = (action: SDKActions) =>
      action.type.startsWith('member') ||
      action.type.startsWith('layout') ||
      action.type.startsWith('call')

    while (true) {
      const action: MapToPubSubShape<VideoAPIEventParams> =
        yield sagaEffects.take(swEventChannel, isUnifiedEvent)

      getLogger().debug('UnifiedEventsWatcher action:', action)

      yield sagaEffects.fork(worker, action)
    }

    getLogger().trace('unifiedEventsWatcher ended')
  }
