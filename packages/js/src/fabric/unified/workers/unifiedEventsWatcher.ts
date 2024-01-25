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
} from '@signalwire/core'
import { RoomSessionConnection } from '../../../BaseRoomSession'
import { fromUnifiedEvent } from './mappers/UnifiedEventsMapper'
import { isMappableObject } from 'packages/core/src/utils/mapObject'

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

function* debugEmitter({
  action,
  instance,
}: {
  action: PubSubAction
  instance: RoomSessionConnection
}) {
  const { type, payload } = action
  // @ts-expect-error
  yield instance.emit(type, payload)
}

export const unifiedEventsWatcher: SDKWorker<RoomSessionConnection> =
  function* (options): SagaIterator {
    const {
      channels: { swEventChannel },
      instance,
    } = options

    getLogger().debug('unifiedEventsWatcher started')

    function* worker(action: any) {
      yield sagaEffects.fork(eventMapperWorker, {
        ...options,
        action,
        swEventChannel,
      })

      // TBD: Do we even need it?
      yield sagaEffects.fork(debugEmitter, {
        ...options,
        action,
        instance,
      })
    }

    const isUnifiedEvent = (action: SDKActions) =>
      action.type.startsWith('member') || action.type.startsWith('layout') || action.type.startsWith('call')

    while (true) {
      const action: MapToPubSubShape<VideoAPIEventParams> =
        yield sagaEffects.take(swEventChannel, isUnifiedEvent)
      getLogger().debug('UnifiedEventsWatcher action:', action)
      yield sagaEffects.fork(worker, action)
    }

    getLogger().trace('unifiedEventsWatcher ended')
  }
