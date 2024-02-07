import {
  MapToPubSubShape,
  SDKActions,
  SDKWorker,
  SagaIterator,
  VideoAPIEventParams,
  getLogger,
  sagaEffects,
  SDKWorkerParams,
  VideoAPIEventNames,
  stripNamespacePrefix,
} from '@signalwire/core'
import { RoomSessionConnection } from '../BaseRoomSession'
import { videoStreamWorker } from './videoStreamWorker'
import { videoRecordWorker } from './videoRecordWorker'
import { videoPlaybackWorker } from './videoPlaybackWorker'
import { videoRoomWorker } from './videoRoomWorker'
import { videoMemberWorker } from './videoMemberWorker'

export type VideoWorkerParams<T> = SDKWorkerParams<RoomSessionConnection> & {
  action: T
}

export const videoWorker: SDKWorker<RoomSessionConnection> = function* (
  options
): SagaIterator {
  const { channels, instance: roomSession } = options
  const { swEventChannel } = channels

  function* worker(action: MapToPubSubShape<VideoAPIEventParams>) {
    const { type, payload } = action

    switch (type) {
      case 'video.room.started':
      case 'video.room.updated':
      case 'video.room.ended':
      case 'video.room.subscribed':
        yield sagaEffects.fork(videoRoomWorker, {
          action,
          ...options,
        })
        return // Return when we don't need to handle the raw event for this
      case 'video.member.joined':
      case 'video.member.left':
      case 'video.member.updated':
      case 'video.member.talking':
        yield sagaEffects.fork(videoMemberWorker, {
          action,
          ...options,
        })
        return
      case 'video.playback.started':
      case 'video.playback.updated':
      case 'video.playback.ended':
        yield sagaEffects.fork(videoPlaybackWorker, {
          action,
          ...options,
        })
        return
      case 'video.recording.started':
      case 'video.recording.updated':
      case 'video.recording.ended':
        yield sagaEffects.fork(videoRecordWorker, {
          action,
          ...options,
        })
        return
      case 'video.stream.ended':
      case 'video.stream.started':
        yield sagaEffects.fork(videoStreamWorker, {
          action,
          ...options,
        })
        return
      case 'video.room.audience_count': {
        roomSession.emit('room.audienceCount', payload)
        return
      }
      default:
        break
    }

    const event = stripNamespacePrefix(type, 'video') as VideoAPIEventNames
    roomSession.emit(event, payload)
  }

  const isVideoOrCallEvent = (action: SDKActions) => {
    return action.type.startsWith('video.') || action.type.startsWith('call.')
  }

  while (true) {
    const action: MapToPubSubShape<VideoAPIEventParams> =
      yield sagaEffects.take(swEventChannel, isVideoOrCallEvent)

    yield sagaEffects.fork(worker, action)
  }

  getLogger().trace('videoWorker ended')
}
