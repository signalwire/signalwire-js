import {
  MapToPubSubShape,
  SDKActions,
  SDKWorker,
  SagaIterator,
  VideoAPIEventParams,
  getLogger,
  sagaEffects,
} from '@signalwire/core'
import { fork } from '@redux-saga/core/effects'
import { Client } from '../VideoClient'
import { videoRoomWorker } from './videoRoomWorker'
import { videoMemberWorker } from './videoMemberWorker'

export const videoCallingWorker: SDKWorker<Client> = function* (
  options
): SagaIterator {
  getLogger().trace('videoCallingWorker started')
  const { channels, instance: client, instanceMap, initialState } = options
  const { swEventChannel } = channels

  function* worker(action: MapToPubSubShape<VideoAPIEventParams>) {
    const { type } = action

    if (type.startsWith('video.room.')) {
      yield fork(videoRoomWorker, {
        action,
        client,
        instanceMap,
        initialState,
      })
    } else if (type.startsWith('video.member.')) {
      yield fork(videoMemberWorker, {
        action,
        client,
        instanceMap,
        initialState,
      })
    }
  }

  const isVideoEvent = (action: SDKActions) => action.type.startsWith('video.')

  while (true) {
    const action: MapToPubSubShape<VideoAPIEventParams> =
      yield sagaEffects.take(swEventChannel, isVideoEvent)

    yield fork(worker, action)
  }

  getLogger().trace('videoCallingWorker ended')
}
