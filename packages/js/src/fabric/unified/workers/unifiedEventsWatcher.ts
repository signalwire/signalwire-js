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
} from '@signalwire/core'
import { RoomSessionConnection } from '../../../BaseRoomSession'

export type VideoWorkerParams<T> = SDKWorkerParams<RoomSessionConnection> & {
  action: T
}

import * as handlers from './handlers'
import * as mappers from './mappers'

import {
  BaseUnifiedEventHandler,
  BaseUnifiedEventMapper,
} from '../BaseUnifiedEventWorker'

//TODO move to own file
// interface DefaultUnifiedEventHandlerOptions {
//   action: any //FIXME
//   sessionEmitter: EventEmitter
// }

export type DefaultUnifiedEventHandlerParams =
  SDKWorkerParams<RoomSessionConnection> & {
    action: MapToPubSubShape<VideoAPIEventParams>
    handlersInstances: BaseUnifiedEventHandler[]
  }

export type DefaultUnifiedEventMapperParams =
  SDKWorkerParams<RoomSessionConnection> & {
    action: MapToPubSubShape<VideoAPIEventParams>
    mapperInstances: BaseUnifiedEventMapper[]
    swEventChannel: SwEventChannel
  }

export function* rootUnifiedEventHandler({
  action,
  handlersInstances,
}: DefaultUnifiedEventHandlerParams) {
  const toExecuteHandlers = handlersInstances.filter((h) => h.worksWith(action))
  toExecuteHandlers.forEach((h) => h.handle(action))
}

export function* rootEventsMapper({
  action,
  mapperInstances,
  swEventChannel,
}: DefaultUnifiedEventMapperParams) {
  const toExecuteHandlers = mapperInstances.filter((h) => h.worksWith(action))
  for (const mapper of toExecuteHandlers) {
    const mapped = mapper.map(action)
    yield sagaEffects.put(swEventChannel, mapped)
  }
}

export const unifiedEventsWatcher: SDKWorker<RoomSessionConnection> =
  function* (options): SagaIterator {
    const {
      channels: { swEventChannel },
      instance: clientInstance,
    } = options

    getLogger().debug('unifiedEventsWatcher started')

    function* worker(action: any) {
      getLogger().debug('### unified event worker', action)

      const handlersInstances = Object.values(handlers).map(
        (klass) => new klass(options)
      )
      const mapperInstances = Object.values(mappers).map(
        (klass) => new klass(options)
      )

      //@ts-ignore
      yield sagaEffects.fork(rootEventsMapper, {
        ...options,
        action,
        sessionEmitter: clientInstance,
        mapperInstances,
      })

      //FIXME
      //@ts-ignore
      yield sagaEffects.fork(rootUnifiedEventHandler, {
        ...options,
        action,
        sessionEmitter: clientInstance,
        handlersInstances,
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
