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

export type VideoWorkerParams<T> = SDKWorkerParams<RoomSessionConnection> & {
  action: T
}

export const videoWorker: SDKWorker<RoomSessionConnection> = function* (
  options
): SagaIterator {
  getLogger().trace('videoWorker started')

  const { channels, instance: roomSession } = options
  const { swEventChannel } = channels

  function* worker(action: MapToPubSubShape<VideoAPIEventParams>) {
    const { type, payload } = action

    switch (type) {
      case 'video.room.subscribed':
        yield sagaEffects.spawn(MemberPosition.memberPositionWorker, {
          ...options,
          instance: roomSession,
          initialState: payload,
        })
        return
      case 'video.playback.started':
      case 'video.playback.updated':
      case 'video.playback.ended':
        yield sagaEffects.fork(videoPlaybackWorker, {
          action,
          ...options,
        })
        return // Return since we don't need to handle the raw event for this
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
      case 'video.layout.changed': {
        // Upsert the layout event which is needed for buildVideoElement
        roomSession.lastLayoutEvent = action.payload
        break
      }
      default:
        break
    }

    const event = stripNamespacePrefix(type, 'video') as VideoAPIEventNames
    roomSession.emit(event, payload)
  }

  const isVideoEvent = (action: SDKActions) => {
    return action.type.startsWith('video.')
  }

  while (true) {
    const action: MapToPubSubShape<VideoAPIEventParams> =
      yield sagaEffects.take(swEventChannel, isVideoEvent)

    yield sagaEffects.fork(worker, action)
  }

  getLogger().trace('videoWorker ended')
}
