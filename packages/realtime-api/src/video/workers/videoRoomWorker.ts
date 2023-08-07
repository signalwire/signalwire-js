import {
  getLogger,
  InternalVideoMemberEntity,
  SagaIterator,
  MemberPosition,
  MapToPubSubShape,
  InternalMemberUpdatedEventNames,
  VideoRoomEvent,
  stripNamespacePrefix,
  RoomStarted,
  RoomUpdated,
  RoomEnded,
  RoomSubscribed,
} from '@signalwire/core'
import { spawn, fork } from '@redux-saga/core/effects'
import { createRoomSessionObject, RoomSession } from '../RoomSession'
import { videoMemberWorker } from './videoMemberWorker'
import {
  createRoomSessionMemberObject,
  RoomSessionMember,
} from '../RoomSessionMember'
import { VideoCallWorkerParams } from './videoCallingWorker'

export const videoRoomWorker = function* (
  options: VideoCallWorkerParams<MapToPubSubShape<VideoRoomEvent>>
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
      payload,
    })
  } else {
    roomSessionInstance.setPayload(payload)
  }
  set<RoomSession>(payload.room_session.id, roomSessionInstance)

  // Create and set member instance if exists
  if ((payload.room_session.members?.length || 0) > 0) {
    ;(payload.room_session.members || []).forEach((member) => {
      let memberInstance = get<RoomSessionMember>(member.id)
      if (!memberInstance) {
        memberInstance = createRoomSessionMemberObject({
          // @ts-expect-error
          store: client.store,
          payload: {
            room_id: payload.room_session.room_id,
            room_session_id: payload.room_session.id,
            // @ts-expect-error
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
    })
  }

  const event = stripNamespacePrefix(type) as
    | RoomStarted
    | RoomUpdated
    | RoomEnded
    | RoomSubscribed

  switch (type) {
    case 'video.room.started':
    case 'video.room.updated': {
      // The `room.updated` event is not documented in @RealTimeVideoApiEvents. For now, ignoring TS issue.
      // @ts-expect-error
      client.emit(event, roomSessionInstance)
      roomSessionInstance.emit(event, roomSessionInstance)
      break
    }
    case 'video.room.ended': {
      client.emit(event as RoomEnded, roomSessionInstance)
      roomSessionInstance.emit(event, roomSessionInstance)
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
      roomSessionInstance.emit(event, roomSessionInstance)
      break
    }
    default:
      break
  }

  getLogger().trace('videoRoomWorker ended')
}
