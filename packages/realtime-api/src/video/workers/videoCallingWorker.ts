import {
  MapToPubSubShape,
  SDKActions,
  SDKWorker,
  SagaIterator,
  VideoAPIEventParams,
  VideoAPISDKEventParams,
  getLogger,
  sagaEffects,
} from '@signalwire/core'
import { fork } from '@redux-saga/core/effects'
import { Client } from '../VideoClient'
import { videoRoomWorker } from './videoRoomWorker'
import { videoMemberWorker } from './videoMemberWorker'
import { videoSDKRoomSessionWorker } from './videoSDKRoomSessionWorker'

export const videoCallingWorker: SDKWorker<Client> = function* (
  options
): SagaIterator {
  getLogger().trace('videoCallingWorker started')
  const { channels } = options
  const { swEventChannel } = channels

  function* worker(
    action: MapToPubSubShape<VideoAPIEventParams | VideoAPISDKEventParams>
  ) {
    const { type } = action

    switch (type) {
      case 'video.room.started':
      case 'video.room.updated':
      case 'video.room.ended':
      case 'video.room.subscribed':
        yield fork(videoRoomWorker, {
          action,
          ...options,
        })
        break
      case 'video.member.joined':
      case 'video.member.left':
      case 'video.member.updated':
      case 'video.member.talking':
        yield fork(videoMemberWorker, {
          action,
          ...options,
        })
        break
      case 'video.sdk.room.sessions':
      case 'video.sdk.room.session':
        yield fork(videoSDKRoomSessionWorker, {
          action,
          ...options,
        })
        break
      default:
        break
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
