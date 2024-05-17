import {
  SDKActions,
  SDKWorker,
  SagaIterator,
  getLogger,
  sagaEffects,
  VideoAction,
  CallFabricAction,
  SDKWorkerParams,
  VideoMemberEventNames,
  VideoRoomSessionEventNames,
} from '@signalwire/core'
import { CallFabricRoomSessionConnection } from '../CallFabricRoomSession'
import * as videoWorkers from '../../video/workers'
import { callJoinWorker } from './callJoinWorker'
import { callLeftWorker } from './callLeftWorker'
import { callStateWorker } from './callStateWorker'

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
        case 'call.joined': {
          yield sagaEffects.fork(callJoinWorker, {
            action,
            ...options,
          })
          return
        }
        case 'call.left': {
          yield sagaEffects.fork(callLeftWorker, {
            action,
            ...options,
          })
          return
        }
        case 'call.state': {
          yield sagaEffects.fork(callStateWorker, {
            action,
            ...options,
          })
          return
        }
        case 'call.started':
        case 'call.updated':
        case 'call.ended': {
          const action = type.split('.')[1]
          const newEventName = `room.${action}` as VideoRoomSessionEventNames
          roomSession.emit(newEventName, payload)
          break
        }
        case 'member.joined':
        case 'member.left':
        case 'member.updated':
        case 'member.talking': {
          const updatedAction = {
            ...action,
            type: `video.${type}` as VideoMemberEventNames,
          }
          // @ts-expect-error
          yield sagaEffects.fork(videoWorkers.videoMemberWorker, {
            action: updatedAction,
            ...options,
          })

          // @ts-expect-error
          yield sagaEffects.put(swEventChannel, updatedAction)
          return
        }
        case 'layout.changed': {
          // Upsert the layout event which is needed for rootElement
          roomSession.lastLayoutEvent = action.payload

          const updatedAction = {
            ...action,
            type: `video.${type}` as 'video.layout.changed',
          }
          yield sagaEffects.put(swEventChannel, updatedAction)
          break
        }
        case 'member.demoted':
        case 'member.promoted': {
          const updatedAction = {
            ...action,
            type: `video.${type}` as
              | 'video.member.demoted'
              | 'video.member.promoted',
          }
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
  }
