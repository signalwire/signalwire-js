import {
  MapToPubSubShape,
  SDKActions,
  SDKWorker,
  SagaIterator,
  VideoAPIEventParams,
  getLogger,
  sagaEffects,
  SDKWorkerParams,
  MemberPosition,
  VideoAPIEventNames,
  stripNamespacePrefix,
} from '@signalwire/core'
import { RoomSessionConnection } from '../BaseRoomSession'
import { videoStreamWorker } from './videoStreamWorker'
import { videoRecordWorker } from './videoRecordWorker'
import { videoPlaybackWorker } from './videoPlaybackWorker'
import { videoRoomWorker } from './videoRoomWorker'

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

    console.log('<< type', type)

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
      case 'video.member.talking': {
        const { member } = payload
        if ('talking' in member) {
          const suffix = member.talking ? 'started' : 'ended'
          roomSession.emit(`member.talking.${suffix}`, payload)

          // Keep for backwards compat.
          const deprecatedSuffix = member.talking ? 'start' : 'stop'
          roomSession.emit(`member.talking.${deprecatedSuffix}`, payload)
        }
        break // Break here since we do need the raw event sent to the client
      }
      default:
        break
    }

    const event = stripNamespacePrefix(type, 'video') as VideoAPIEventNames
    console.log('<< raw emit', event)
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
