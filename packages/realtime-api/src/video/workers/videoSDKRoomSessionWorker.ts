import { getLogger, SagaIterator, SDKWorkerParams } from '@signalwire/core'
import { createRoomSessionObject, RoomSession } from '../RoomSession'
import type { Client } from '../VideoClient'

export const videoSDKRoomSessionWorker = function* (
  options: SDKWorkerParams<Client> & {
    action: any
  }
): SagaIterator {
  getLogger().trace('videoSDKRoomSessionWorker started')
  const { instance, action, instanceMap } = options
  const { type, payload } = action
  const { set } = instanceMap

  switch (type) {
    case 'video.sdk.room.sessions': {
      const roomSessions: RoomSession[] = []

      payload.forEach((room_session: any) => {
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
      const roomSession = createRoomSessionObject({
        // @ts-expect-error
        store: instance.store,
        // @ts-expect-error
        emitter: instance.emitter,
        payload: { room_session: payload },
      })
      set<RoomSession>(roomSession.id, roomSession)

      instance.baseEmitter.emit('video.room.session', roomSession)
      break
    }
    default:
      break
  }

  getLogger().trace('videoSDKRoomSessionWorker ended')
}
