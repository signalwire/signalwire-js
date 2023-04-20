import {
  getLogger,
  SagaIterator,
  SDKWorkerParams,
  SDKRoomSessions,
  SDKRoomSession,
  ToInternalVideoEvent,
  InternalVideoRoomSessionEntity,
} from '@signalwire/core'
import { createRoomSessionObject, RoomSession } from '../RoomSession'
import type { Client } from '../VideoClient'

type VideoSDKRoomSessionEvents =
  | {
      type: ToInternalVideoEvent<SDKRoomSessions>
      payload: any[]
    }
  | {
      type: ToInternalVideoEvent<SDKRoomSession>
      payload: InternalVideoRoomSessionEntity
    }

export const videoSDKRoomSessionWorker = function* (
  options: SDKWorkerParams<Client> & {
    action: VideoSDKRoomSessionEvents
  }
): SagaIterator {
  getLogger().trace('videoSDKRoomSessionWorker started')
  const {
    instance,
    action: { type, payload },
    instanceMap: { set, get },
  } = options

  switch (type) {
    case 'video.sdk.room.sessions': {
      const roomSessions: RoomSession[] = []
      const rooms = payload as InternalVideoRoomSessionEntity[]
      rooms.forEach((room_session) => {
        const session = createRoomSessionObject({
          // @ts-expect-error
          store: instance.store,
          // @ts-expect-error
          emitter: instance.emitter,
          payload: { room_session },
        })
        roomSessions.push(session)
        set<RoomSession>(session.id, session)
      })

      instance.baseEmitter.emit('video.room.sessions', roomSessions)
      break
    }
    case 'video.sdk.room.session': {
      const room = payload as InternalVideoRoomSessionEntity
      let roomSession = get<RoomSession>(room.id)
      if (!roomSession) {
        roomSession = createRoomSessionObject({
          // @ts-expect-error
          store: instance.store,
          // @ts-expect-error
          emitter: instance.emitter,
          payload: { room_session: payload },
        })
      } else {
        roomSession.setPayload({
          room_session: room,
        })
      }
      set<RoomSession>(roomSession.id, roomSession)

      instance.baseEmitter.emit('video.room.session', roomSession)
      break
    }
    default:
      break
  }

  getLogger().trace('videoSDKRoomSessionWorker ended')
}
