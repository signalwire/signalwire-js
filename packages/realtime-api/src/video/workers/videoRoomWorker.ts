import {
  getLogger,
  InternalVideoMemberEntity,
  SagaIterator,
  MemberPosition,
  MapToPubSubShape,
  InternalMemberUpdatedEventNames,
  VideoRoomEvent,
  sagaEffects,
} from '@signalwire/core'
import { videoMemberWorker } from './videoMemberWorker'
import { RoomSessionMember, RoomSessionMemberAPI } from '../RoomSessionMember'
import { VideoCallWorkerParams } from './videoCallingWorker'
import { RoomSession, RoomSessionAPI } from '../RoomSession'

export const videoRoomWorker = function* (
  options: VideoCallWorkerParams<MapToPubSubShape<VideoRoomEvent>>
): SagaIterator {
  getLogger().trace('videoRoomWorker started')
  const { video, action, ...memberPositionWorkerParams } = options
  const { type, payload } = action
  const { get, set, remove } = options.instanceMap

  let roomSessionInstance = get<RoomSession>(payload.room_session.id)
  if (!roomSessionInstance) {
    roomSessionInstance = new RoomSessionAPI({
      video,
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
        memberInstance = new RoomSessionMemberAPI({
          roomSession: roomSessionInstance,
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
    })
  }

  switch (type) {
    case 'video.room.started': {
      video.emit('room.started', roomSessionInstance)
      roomSessionInstance.emit('room.started', roomSessionInstance)
      break
    }
    case 'video.room.updated': {
      roomSessionInstance.emit('room.updated', roomSessionInstance)
      break
    }
    case 'video.room.ended': {
      video.emit('room.ended', roomSessionInstance)
      roomSessionInstance.emit('room.ended', roomSessionInstance)
      remove<RoomSession>(payload.room_session.id)
      break
    }
    case 'video.room.subscribed': {
      yield sagaEffects.fork(MemberPosition.memberPositionWorker, {
        ...memberPositionWorkerParams,
        instance: roomSessionInstance,
        initialState: payload,
        dispatcher: function* (
          subType: InternalMemberUpdatedEventNames,
          subPayload
        ) {
          yield sagaEffects.fork(videoMemberWorker, {
            ...options,
            action: { type: subType, payload: subPayload },
          })
        },
      })
      roomSessionInstance.emit('room.subscribed', roomSessionInstance)
      break
    }
    default:
      break
  }

  getLogger().trace('videoRoomWorker ended')
}
