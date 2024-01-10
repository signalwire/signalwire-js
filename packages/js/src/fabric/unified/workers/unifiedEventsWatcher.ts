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
  EventEmitter,
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
      //@ts-ignore
      yield sagaEffects.put(swEventChannel, mappedAction)
    }
  }
}

function* debugEmitter({
  action,
  instance,
}: {
  action: PubSubAction
  instance: EventEmitter
}) {
  const { type, payload } = action
  yield instance.emit(type, payload)
}

export const unifiedEventsWatcher: SDKWorker<RoomSessionConnection> =
  function* (options): SagaIterator {
    const {
      channels: { swEventChannel },
    } = options

    getLogger().debug('unifiedEventsWatcher started')

    function* worker(action: any) {
      getLogger().debug('### unified event worker', action)

      //@ts-ignore
      yield sagaEffects.fork(eventMapperWorker, {
        ...options,
        action,
        swEventChannel,
      })

      //@ts-ignore
      yield sagaEffects.fork(debugEmitter, {
        ...options,
        action,
        swEventChannel,
      })
    }

    const isUnifiedEvent = (action: SDKActions) =>
      action.type.startsWith('call.') ||
      action.type.startsWith('member') ||
      action.type.startsWith('layout')

    while (true) {
      const action: MapToPubSubShape<VideoAPIEventParams> =
        yield sagaEffects.take(swEventChannel, isUnifiedEvent)
      getLogger().debug('UnifiedEventsWatcher action:', action)
      yield sagaEffects.fork(worker, action)
    }

    getLogger().trace('unifiedEventsWatcher ended')
  }
