import {
  MapToPubSubShape,
  SDKActions,
  SDKWorker,
  SagaIterator,
  VideoAPIEvent,
  getLogger,
  sagaEffects,
  sagaHelpers,
  SDKWorkerParams,
} from '@signalwire/core'
import type { Client } from '../../client/index'
import { videoRoomWorker } from './videoRoomWorker'
import { videoMemberWorker } from './videoMemberWorker'
import { videoLayoutWorker } from './videoLayoutWorker'
import { videoRoomAudienceWorker } from './videoRoomAudienceWorker'
import { videoRecordingWorker } from './videoRecordingWorker'
import { videoPlaybackWorker } from './videoPlaybackWorker'
import { Video } from '../Video'
import { videoStreamWorker } from './videoStreamWorker'

export type VideoCallWorkerParams<T> = SDKWorkerParams<Client> & {
  action: T
  video: Video
}

interface VideoCallingWorkerInitialState {
  video: Video
}

export const videoCallingWorker: SDKWorker<Client> = function* (
  options
): SagaIterator {
  getLogger().trace('videoCallingWorker started')
  const {
    channels: { swEventChannel },
    initialState,
  } = options

  const { video } = initialState as VideoCallingWorkerInitialState

  function* worker(action: MapToPubSubShape<VideoAPIEvent>) {
    const { type } = action

    switch (type) {
      case 'video.room.started':
      case 'video.room.updated':
      case 'video.room.ended':
      case 'video.room.subscribed':
        yield sagaEffects.fork(videoRoomWorker, {
          action,
          video,
          ...options,
        })
        break
      case 'video.member.joined':
      case 'video.member.left':
      case 'video.member.updated':
      case 'video.member.talking':
        yield sagaEffects.fork(videoMemberWorker, {
          action,
          video,
          ...options,
        })
        break
      case 'video.layout.changed':
        yield sagaEffects.fork(videoLayoutWorker, {
          action,
          video,
          ...options,
        })
        break
      case 'video.room.audience_count':
        yield sagaEffects.fork(videoRoomAudienceWorker, {
          action,
          video,
          ...options,
        })
        break
      case 'video.playback.started':
      case 'video.playback.updated':
      case 'video.playback.ended':
        yield sagaEffects.fork(videoPlaybackWorker, {
          action,
          video,
          ...options,
        })
        break
      case 'video.recording.started':
      case 'video.recording.updated':
      case 'video.recording.ended':
        yield sagaEffects.fork(videoRecordingWorker, {
          action,
          video,
          ...options,
        })
        break
      case 'video.stream.started':
      case 'video.stream.ended':
        yield sagaEffects.fork(videoStreamWorker, {
          action,
          video,
          ...options,
        })
        break
      default:
        getLogger().warn(`Unknown video event: "${type}"`)
        break
    }
  }

  const workerCatchable = sagaHelpers.createCatchableSaga<
    MapToPubSubShape<VideoAPIEvent>
  >(worker, (error) => {
    getLogger().error('Voice calling event error', error)
  })

  const isVideoEvent = (action: SDKActions) => action.type.startsWith('video.')

  while (true) {
    const action: MapToPubSubShape<VideoAPIEvent> = yield sagaEffects.take(
      swEventChannel,
      isVideoEvent
    )

    yield sagaEffects.fork(workerCatchable, action)
  }

  getLogger().trace('videoCallingWorker ended')
}
