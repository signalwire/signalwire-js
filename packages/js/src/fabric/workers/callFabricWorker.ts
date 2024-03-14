import {
  SDKActions,
  SDKWorker,
  SagaIterator,
  getLogger,
  sagaEffects,
  VideoAPIEventNames,
  stripNamespacePrefix,
  VideoAction,
  CallFabricAction,
  SDKWorkerParams,
} from '@signalwire/core'
import { CallFabricRoomSessionConnection } from '../CallFabricBaseRoomSession'
import * as videoWorkers from '../../video/workers'
import { callJoinWorker } from './callJoinWorker'

export type CallFabricWorkerParams<T> =
  SDKWorkerParams<CallFabricRoomSessionConnection> & {
    action: T
  }

export const callFabricWorker: SDKWorker<CallFabricRoomSessionConnection> =
  function* (options): SagaIterator {
    getLogger().trace('callFabricWorker started')

    const { channels, instance: roomSession } = options
    const { swEventChannel } = channels

    function* worker(action: VideoAction | CallFabricAction) {
      const { type, payload } = action

      switch (type) {
        case 'call.joined':
          yield sagaEffects.fork(callJoinWorker, {
            action,
            ...options,
          })
          return
        case 'video.room.started':
        case 'video.room.updated':
        case 'video.room.ended':
        case 'video.room.subscribed':
          yield sagaEffects.fork(videoWorkers.videoRoomWorker, {
            action,
            ...options,
          })
          return // Return when we don't need to handle the raw event for this
        case 'video.member.joined':
        case 'video.member.left':
        case 'video.member.updated':
        case 'video.member.talking':
          yield sagaEffects.fork(videoWorkers.videoMemberWorker, {
            action,
            ...options,
          })
          return
        case 'video.playback.started':
        case 'video.playback.updated':
        case 'video.playback.ended':
          yield sagaEffects.fork(videoWorkers.videoPlaybackWorker, {
            action,
            ...options,
          })
          return
        case 'video.recording.started':
        case 'video.recording.updated':
        case 'video.recording.ended':
          yield sagaEffects.fork(videoWorkers.videoRecordWorker, {
            action,
            ...options,
          })
          return
        case 'video.stream.ended':
        case 'video.stream.started':
          yield sagaEffects.fork(videoWorkers.videoStreamWorker, {
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
      const action = yield sagaEffects.take(swEventChannel, isVideoOrCallEvent)

      yield sagaEffects.fork(worker, action)
    }

    getLogger().trace('callFabricWorker ended')
  }
