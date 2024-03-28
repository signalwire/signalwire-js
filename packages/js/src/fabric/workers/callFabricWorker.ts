import {
  SDKActions,
  SDKWorker,
  SagaIterator,
  getLogger,
  sagaEffects,
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

      console.log('>> callFabricWorker receive', type)

      switch (type) {
        case 'call.joined': {
          yield sagaEffects.fork(callJoinWorker, {
            action,
            ...options,
          })
          return
        }
        // @ts-expect-error
        case 'call.left': {
          options.callSegments.pop()
          break
        }
        case 'call.started':
        case 'call.updated':
        case 'call.ended': {
          const action = type.split('.')[1]
          const newEventName = `room.${action}`
          // @ts-expect-error
          roomSession.emit(newEventName, payload)
          return
        }
        case 'member.joined':
        case 'member.left':
        case 'member.updated':
        case 'member.talking': {
          const updatedAction = {
            ...action,
            type: `video.${type}`,
          }
          // @ts-expect-error
          yield sagaEffects.fork(videoWorkers.videoMemberWorker, {
            action: updatedAction,
            ...options,
          })
          return
        }
        case 'member.demoted':
        case 'member.promoted':
        case 'layout.changed': {
          const updatedAction = {
            ...action,
            type: `video.${type}`,
          }
          // @ts-expect-error
          yield sagaEffects.put(swEventChannel, updatedAction)
          return
        }
        default:
          break
      }

      // @ts-expect-error
      roomSession.emit(type, payload)
    }

    const isVideoOrCallEvent = (action: SDKActions) => {
      return (
        action.type.startsWith('call.') ||
        action.type.startsWith('member.') ||
        action.type.startsWith('layout.')
      )
    }

    while (true) {
      const action = yield sagaEffects.take(swEventChannel, isVideoOrCallEvent)

      yield sagaEffects.fork(worker, action)
    }

    getLogger().trace('callFabricWorker ended')
  }
