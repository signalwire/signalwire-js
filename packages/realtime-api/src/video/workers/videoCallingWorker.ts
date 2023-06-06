import {
  MapToPubSubShape,
  SDKActions,
  SDKWorker,
  SagaIterator,
  VideoAPIEventParams,
  getLogger,
  sagaEffects,
  SDKWorkerParams,
} from '@signalwire/core'
import { fork } from '@redux-saga/core/effects'
import { Client } from '../VideoClient'
import { videoRoomWorker } from './videoRoomWorker'
import { videoMemberWorker } from './videoMemberWorker'
import { videoPlaybackWorker } from './videoPlaybackWorker'
import { videoRecordingWorker } from './videoRecordingWorker'
import { videoStreamWorker } from './videoStreamWorker'
import { videoLayoutWorker } from './videoLayoutWorker'
import { videoRoomAudienceWorker } from './videoRoomAudienceWorker'

export type VideoCallWorkerParams<T> = SDKWorkerParams<Client> & {
  action: T
}

export const videoCallingWorker: SDKWorker<Client> = function* (
  options
): SagaIterator {
  getLogger().trace('videoCallingWorker started')
  const { channels } = options
  const { swEventChannel } = channels

  function* worker(action: MapToPubSubShape<VideoAPIEventParams>) {
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
      case 'video.playback.started':
      case 'video.playback.updated':
      case 'video.playback.ended':
        yield fork(videoPlaybackWorker, {
          action,
          ...options,
        })
        break
      case 'video.recording.started':
      case 'video.recording.updated':
      case 'video.recording.ended':
        yield fork(videoRecordingWorker, {
          action,
          ...options,
        })
        break
      case 'video.stream.started':
      case 'video.stream.ended':
        yield fork(videoStreamWorker, {
          action,
          ...options,
        })
        break
      case 'video.layout.changed':
        yield fork(videoLayoutWorker, {
          action,
          ...options,
        })
        break
      case 'video.room.audience_count':
        yield fork(videoRoomAudienceWorker, {
          action,
          ...options,
        })
        break
      default:
        getLogger().warn(`Unknown video event: "${type}"`)
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
