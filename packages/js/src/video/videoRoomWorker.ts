import {
  getLogger,
  SagaIterator,
  MapToPubSubShape,
  Rooms,
  RoomSessionMember,
  VideoRoomEvent,
  sagaEffects,
  MemberPosition,
  InternalMemberUpdatedEventNames,
  InternalVideoMemberEntity,
} from '@signalwire/core'
import { VideoWorkerParams } from './videoWorker'
import { videoMemberWorker } from './videoMemberWorker'

export const videoRoomWorker = function* (
  options: VideoWorkerParams<MapToPubSubShape<VideoRoomEvent>>
): SagaIterator {
  getLogger().trace('videoRoomWorker started')
  const { action, ...memberPositionWorkerParams } = options
  const { type, payload } = action
  const {
    instance: roomSession,
    instanceMap: { get, set },
  } = options

  // For now, we are not storing the RoomSession object in the instance map

  // Upsert member in the instance map
  if ((payload.room_session?.members?.length || 0) > 0) {
    ;(payload.room_session.members || []).forEach((member) => {
      const memberId = member.id || member.member_id!
      const roomSessionId =
        payload.room_session.id || payload.room_session.room_session_id!

      let memberInstance = get<RoomSessionMember>(memberId)
      if (!memberInstance) {
        memberInstance = Rooms.createRoomSessionMemberObject({
          store: roomSession.store,
          payload: {
            room_id: payload.room_session.room_id,
            room_session_id: roomSessionId,
            member: member as InternalVideoMemberEntity & { talking: boolean },
          },
        })
      } else {
        memberInstance.setPayload({
          room_id: payload.room_session.room_id,
          room_session_id: roomSessionId,
          member: member as InternalVideoMemberEntity & { talking: boolean },
        })
      }
      set<RoomSessionMember>(memberId, memberInstance)
    })
  }

  switch (type) {
    case 'video.room.started': {
      roomSession.emit('room.started', payload)
      break
    }
    case 'video.room.updated': {
      roomSession.emit('room.updated', payload)
      break
    }
    case 'video.room.ended': {
      roomSession.emit('room.ended', payload)
      break
    }
    case 'video.room.subscribed': {
      yield sagaEffects.spawn(MemberPosition.memberPositionWorker, {
        ...memberPositionWorkerParams,
        instance: roomSession,
        initialState: payload,
        dispatcher: function* (
          subType: InternalMemberUpdatedEventNames,
          subPayload
        ) {
          console.log('dispatched by member memberPositionWorker', {
            type: subType,
            payload: subPayload,
          })
          yield sagaEffects.fork(videoMemberWorker, {
            ...options,
            action: { type: subType, payload: subPayload },
          })
        },
      })
      for (const memberPayload of payload.room_session.members) {
        //@ts-expect-error
        yield sagaEffects.fork(videoMemberWorker, {
          ...options,
          action: {
            type: 'video.member.joined',
            payload: { member: memberPayload },
          },
        })
      }
      roomSession.emit('room.subscribed', payload)
      break
    }
    default:
      break
  }

  getLogger().trace('videoRoomWorker ended')
}
