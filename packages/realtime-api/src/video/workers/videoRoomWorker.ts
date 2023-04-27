import {
  getLogger,
  InternalVideoMemberEntity,
  SagaIterator,
  MemberPosition,
  SDKWorkerParams,
  VideoRoomStartedEvent,
  VideoRoomSubscribedEvent,
  VideoRoomUpdatedEvent,
  VideoRoomEndedEvent,
  MapToPubSubShape,
  InternalMemberUpdatedEventNames,
} from '@signalwire/core'
import { spawn, fork } from '@redux-saga/core/effects'
import type { Client } from '../VideoClient'
import { createRoomSessionObject, RoomSession } from '../RoomSession'
import { videoMemberWorker } from './videoMemberWorker'
import {
  createRoomSessionMemberObject,
  RoomSessionMember,
} from '../RoomSessionMember'

type VideoRoomEvents = MapToPubSubShape<
  | VideoRoomStartedEvent
  | VideoRoomSubscribedEvent
  | VideoRoomUpdatedEvent
  | VideoRoomEndedEvent
>

export const videoRoomWorker = function* (
  options: SDKWorkerParams<Client> & {
    action: VideoRoomEvents
  }
): SagaIterator {
  getLogger().trace('videoRoomWorker started')
  const { instance: client, action, ...memberPositionWorkerParams } = options
  const { type, payload } = action
  const { get, set, remove } = options.instanceMap

  let roomSessionInstance = get<RoomSession>(payload.room_session.id)
  if (!roomSessionInstance) {
    roomSessionInstance = createRoomSessionObject({
      // @ts-expect-error
      store: client.store,
      // @ts-expect-error
      emitter: client.emitter,
      payload,
    })
  } else {
    roomSessionInstance.setPayload(payload)
  }
  set<RoomSession>(payload.room_session.id, roomSessionInstance)

  // Create and set member instance if exists
  if ((payload.room_session.members?.length || 0) > 0) {
    ;(payload.room_session.members || []).forEach(
      (member: InternalVideoMemberEntity) => {
        let memberInstance = get<RoomSessionMember>(member.id)
        if (!memberInstance) {
          memberInstance = createRoomSessionMemberObject({
            // @ts-expect-error
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
            member: member as InternalVideoMemberEntity & { talking: boolean },
          })
        }
        set<RoomSessionMember>(member.id, memberInstance)
      }
    )
  }

  switch (type) {
    case 'video.room.started':
    case 'video.room.updated': {
      client.baseEmitter.emit(type, roomSessionInstance)
      roomSessionInstance.baseEmitter.emit(type, roomSessionInstance)
      break
    }
    case 'video.room.ended': {
      client.baseEmitter.emit(type, roomSessionInstance)
      roomSessionInstance.baseEmitter.emit(type, roomSessionInstance)
      remove<RoomSession>(payload.room_session.id)
      break
    }
    case 'video.room.subscribed': {
      yield spawn(MemberPosition.memberPositionWorker, {
        ...memberPositionWorkerParams,
        instance: roomSessionInstance,
        initialState: payload,
        dispatcher: function* (
          subType: InternalMemberUpdatedEventNames,
          subPayload
        ) {
          yield fork(videoMemberWorker, {
            ...options,
            action: { type: subType, payload: subPayload },
          })
        },
      })
      roomSessionInstance.baseEmitter.emit(type, roomSessionInstance)
      break
    }
    default:
      break
  }

  getLogger().trace('videoRoomWorker ended')
}
