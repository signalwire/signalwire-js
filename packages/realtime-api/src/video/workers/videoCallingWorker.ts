import {
  MapToPubSubShape,
  SDKActions,
  SDKWorker,
  SagaIterator,
  SwEventParams,
  getLogger,
  sagaEffects,
} from '@signalwire/core'
import { fork } from '@redux-saga/core/effects'
import { Client } from '../VideoClient'
import { videoRoomWorker } from './videoRoomWorker'

export const videoCallingWorker: SDKWorker<Client> = function* (
  options
): SagaIterator {
  getLogger().trace('videoCallingWorker started')
  const { channels, instance, initialState, instanceMap } = options
  const { swEventChannel } = channels

  // @TODO: proper action type
  function* worker(action: any) {
    const { type } = action

    if (type.startsWith('video.room.')) {
      // @ts-expect-error
      yield fork(videoRoomWorker, {
        client: instance,
        initialState,
        instanceMap,
        action,
      })
    }
  }

  const isVideoEvent = (action: SDKActions) => action.type.startsWith('video.')

  while (true) {
    const action: MapToPubSubShape<SwEventParams> = yield sagaEffects.take(
      swEventChannel,
      isVideoEvent
    )

    yield fork(worker, action)
  }

  getLogger().trace('videoCallingWorker ended')
}
