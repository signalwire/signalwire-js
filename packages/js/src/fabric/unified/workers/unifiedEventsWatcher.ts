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

// import {
//   BaseUnifiedEventHandler,
//   BaseUnifiedEventMapper,
// } from '../BaseUnifiedEventWorker'

//TODO move to own file
// interface DefaultUnifiedEventHandlerOptions {
//   action: any //FIXME
//   sessionEmitter: EventEmitter
// }

export type DefaultUnifiedEventHandlerParams =
  SDKWorkerParams<RoomSessionConnection> & {
    action: MapToPubSubShape<VideoAPIEventParams>
    handlersInstances: handlers.UnifiedEventsHandlerInterface[]
  }

export type DefaultUnifiedEventMapperParams =
  SDKWorkerParams<RoomSessionConnection> & {
    action: MapToPubSubShape<VideoAPIEventParams>
    mapperInstances: mappers.UnifiedEventsMapperInterface[]
    swEventChannel: SwEventChannel
  }

export function* rootUnifiedEventHandler({
  action,
  handlersInstances,
}: DefaultUnifiedEventHandlerParams) {
  const toExecuteHandlers = handlersInstances.filter((h) => h.filter(action))
  for (const h of toExecuteHandlers) {
    yield h.handle(action)
  }
}

export function* rootEventsMapper({
  action,
  mapperInstances,
  swEventChannel,
}: DefaultUnifiedEventMapperParams) {
  const toExecuteHandlers = mapperInstances.filter((h) => h.filter(action))
  for (const mapper of toExecuteHandlers) {
    const mappedActions = mapper.mapAction(action)
    for(const mappedAction of mappedActions) {
      //@ts-expect-error invalid mappedAction will be ignored 
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

    //instantiate handlers once
    const handlersInstances = Object.values(handlers)
      .map((klass) => {
        try {
          return new klass(options)
        } catch (e) {
          return
        }
      })
      .filter((instance) => !!instance)

    //instantiate mappers once
    const mapperInstances = Object.values(mappers)
      .map((klass) => {
        try {
          return new klass()
        } catch (e) {
          return
        }
      })
      .filter((instance) => !!instance)

    function* worker(action: any) {
      getLogger().debug('### unified event worker', action)

      //@ts-ignore
      yield sagaEffects.fork(rootEventsMapper, {
        ...options,
        action,
        swEventChannel,
        mapperInstances,
      })

      //FIXME
      //@ts-ignore
      yield sagaEffects.fork(rootUnifiedEventHandler, {
        ...options,
        action,
        swEventChannel,
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
