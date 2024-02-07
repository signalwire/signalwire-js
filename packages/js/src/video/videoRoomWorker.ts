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
    instance: roomSessionInstance,
    instanceMap: { get, set },
  } = options

  console.log('action', type, payload)

  // For now, we are not storing the RoomSession object in the instance map

  // Upsert member in the instance map
  if ((payload.room_session.members?.length || 0) > 0) {
    ;(payload.room_session.members || []).forEach((member) => {
      let memberInstance = get<RoomSessionMember>(member.id)
      if (!memberInstance) {
        memberInstance = Rooms.createRoomSessionMemberObject({
          store: roomSessionInstance.store,
          payload: member,
        })
      } else {
        memberInstance.setPayload(member)
      }
      set<RoomSessionMember>(member.id, memberInstance)
    })
  }

  switch (type) {
    case 'video.room.started': {
      roomSessionInstance.emit('room.started', payload)
      break
    }
    case 'video.room.updated': {
      roomSessionInstance.emit('room.updated', payload)
      break
    }
    case 'video.room.ended': {
      roomSessionInstance.emit('room.ended', payload)
      break
    }
    case 'video.room.subscribed': {
      yield sagaEffects.spawn(MemberPosition.memberPositionWorker, {
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
