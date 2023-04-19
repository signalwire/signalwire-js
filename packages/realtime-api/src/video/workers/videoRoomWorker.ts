import {
  getLogger,
  InternalVideoMemberEntity,
  SagaIterator,
  SDKCallWorker,
  VideoRoomEventParams,
  workers,
} from '@signalwire/core'
import { spawn, fork } from '@redux-saga/core/effects'
import type { Client } from '../../client/index'
import { createRoomSessionObject, RoomSession } from '../RoomSession'
import { videoMemberWorker } from './videoMemberWorker'
import {
  createRoomSessionMemberObject,
  RoomSessionMember,
} from '../RoomSessionMember'

export const videoRoomWorker: SDKCallWorker<VideoRoomEventParams, Client> =
  function* (options): SagaIterator {
    getLogger().trace('videoRoomWorker started')
    const { client, action, instanceMap } = options
    const { type, payload } = action

    const { get, set, remove } = instanceMap

    switch (type) {
      case 'video.room.started': {
        yield spawn(workers.memberPositionWorker, {
          dispatcher: function* (type, payload) {
            yield fork(videoMemberWorker, {
              ...options,
              action: { type, payload },
            })
          },
          ...options,
        })
        let roomSessionInstance = get<RoomSession>(payload.room_session.id)
        if (!roomSessionInstance) {
          roomSessionInstance = createRoomSessionObject({
            store: client.store,
            // @ts-expect-error
            emitter: client.emitter,
            payload,
          })
        } else {
          roomSessionInstance.setPayload(payload)
        }
        set<RoomSession>(payload.room_session.id, roomSessionInstance)
        // @ts-expect-error
        client.baseEmitter.emit(type, roomSessionInstance)
        break
      }
      case 'video.room.updated': {
        const roomSessionInstance = get<RoomSession>(payload.room_session.id)
        // @ts-expect-error
        client.baseEmitter.emit(type, roomSessionInstance)
        break
      }
      case 'video.room.ended': {
        const roomSessionInstance = get<RoomSession>(payload.room_session.id)
        // @ts-expect-error
        client.baseEmitter.emit(type, roomSessionInstance)
        remove<RoomSession>(payload.room_session.id)
        break
      }
      case 'video.room.subscribed': {
        let roomSessionInstance = get<RoomSession>(payload.room_session.id)
        if (!roomSessionInstance) {
          roomSessionInstance = createRoomSessionObject({
            store: client.store,
            // @ts-expect-error
            emitter: client.emitter,
            payload,
          })
        } else {
          roomSessionInstance.setPayload(payload)
        }
        set<RoomSession>(payload.room_session.id, roomSessionInstance)

        if ((payload.room_session.members?.length || 0) > 0) {
          ;(payload.room_session.members || []).forEach(
            (member: InternalVideoMemberEntity) => {
              let memberInstance = get<RoomSessionMember>(member.id)
              if (!memberInstance) {
                memberInstance = createRoomSessionMemberObject({
                  store: client.store,
                  // @ts-expect-error
                  emitter: client.emitter,
                  payload: {
                    room_id: payload.room_session.room_id,
                    room_session_id: payload.room_session.id,
                    member,
                  },
                })
              } else {
                memberInstance.setPayload({
                  room_id: payload.room_session.room_id,
                  room_session_id: payload.room_session.id,
                  member,
                })
              }
              set<RoomSessionMember>(member.id, memberInstance)
            }
          )
        }
        roomSessionInstance.baseEmitter.emit(type, roomSessionInstance)
        break
      }
      default:
        break
    }

    getLogger().trace('videoRoomWorker ended')
  }
