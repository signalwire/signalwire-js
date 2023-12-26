import {
  MapToPubSubShape,
  SDKActions,
  SDKWorker,
  SagaIterator,
  VideoAPIEventParams,
  getLogger,
  sagaEffects,
  SDKWorkerParams,
  EventEmitter,
  SwEventChannel,
} from '@signalwire/core'
import { RoomSessionConnection } from '../../../BaseRoomSession'

export type VideoWorkerParams<T> = SDKWorkerParams<RoomSessionConnection> & {
  action: T
}

import * as handlers from './handlers'

//TODO move to own file
// interface DefaultUnifiedEventHandlerOptions {
//   action: any //FIXME
//   sessionEmitter: EventEmitter
// }

export type DefaultUnifiedEventHandlerParams<T> =
  SDKWorkerParams<RoomSessionConnection> & {
    action: T
    sessionEmitter: EventEmitter
    handlersInstances: handlers.BaseUnifiedEventHandler[]
  }

export function* defaultUnifiedEventHandler({
  action,
  handlersInstances,
}: DefaultUnifiedEventHandlerParams<{ type: any; payload: any }>) {
  const { type, payload } = action

  const toExecuteHandlers = handlersInstances.filter((h) =>
    h.isHandlerFor(type)
  )
  toExecuteHandlers.forEach((h) => h.handle(type, payload))
}

export type UnifiedStateEventMapperParams<T> =
  SDKWorkerParams<RoomSessionConnection> & {
    action: T
    swEventChannel: SwEventChannel
  }

export function* unifiedStateEventsMapper({
  action,
  swEventChannel,
}: UnifiedStateEventMapperParams<{ type: any; payload: any }>) {
  const { type, payload } = action

  const isStateEvent = (type: string, suffix: string) =>
    type.endsWith(`.${suffix}`)

  getLogger().debug('### unifiedStateEventsMapper')
  const stateKey = Object.keys(payload).find((k) => k.includes('_state'))
  getLogger().debug('### unifiedStateEventsMapper stateKey:', stateKey)
  if (stateKey && !isStateEvent(type, payload[stateKey])) {
    getLogger().debug(
      '### unifiedStateEventsMapper putting:',
      `${type}.${payload[stateKey]}`
    )

    yield sagaEffects.put(swEventChannel, {
      //@ts-ignore
      type: `${type}.${payload[stateKey]}`,
      payload,
    })
  }
}

export const unifiedEventsWatcher: SDKWorker<RoomSessionConnection> =
  function* (options): SagaIterator {
    const {
      channels: { swEventChannel },
      instance: clientInstance,
    } = options

    getLogger().debug('unifiedEventsWatcher started')

    function* worker(
      action: any,
      handlersInstances: handlers.BaseUnifiedEventHandler[]
    ) {
      getLogger().debug('### unified event worker', action)
      //FIXME
      //@ts-ignore
      yield sagaEffects.fork(defaultUnifiedEventHandler, {
        ...options,
        action,
        sessionEmitter: clientInstance,
        handlersInstances,
      })

      //@ts-ignore
      yield sagaEffects.fork(unifiedStateEventsMapper, {
        action,
        swEventChannel,
      })
    }

    const isUnifiedEvent = (action: SDKActions) =>
      action.type.startsWith('call.') ||
      action.type.startsWith('member') ||
      action.type.startsWith('layout')

    const handlersInstances = Object.values(handlers).map(
      (klass) => new klass(options)
    )

    while (true) {
      const action: MapToPubSubShape<VideoAPIEventParams> =
        yield sagaEffects.take(swEventChannel, isUnifiedEvent)
      getLogger().debug('UnifiedEventsWatcher action:', action)
      yield sagaEffects.fork(worker, action, handlersInstances)
    }

    getLogger().trace('unifiedEventsWatcher ended')
  }
