import type { Video } from '@signalwire/js'
import { proxy, ref, subscribe } from 'valtio'
import { watch, subscribeKey } from 'valtio/utils'

interface InternalState {
  roomSessionId: string
  rooms: Record<string, Video.RoomSession>
}

const state = proxy<InternalState>({
  roomSessionId: '',
  rooms: {},
})

const getRoomSession = (roomSessionId?: string) => {
  const id = roomSessionId || state.roomSessionId

  const room = state.rooms[id]

  if (roomSessionId && !room) {
    throw new Error(`RoomSession with id ${id} not found`)
  }

  return room
}

const setRoomSession = (
  roomSessionId: string,
  roomSession: Video.RoomSession
) => {
  // https://github.com/pmndrs/valtio#holding-objects-in-state-without-tracking-them
  state.rooms[roomSessionId] = ref(roomSession)
  // Reference to the last created roomSession's id. This
  // won't work if we plan to support multiple RoomSession
  // instances at once.
  state['roomSessionId'] = roomSessionId
}

const onRoomSessionReady = async ({
  destroyCallback,
}: { destroyCallback?: any } = {}) => {
  return new Promise<Video.RoomSession>((resolve) => {
    if (state.roomSessionId) {
      return resolve(getRoomSession())
    }

    subscribeKey(state, 'roomSessionId', (v) => {
      const id = state.roomSessionId
      const room = state.rooms[id]

      if (room) {
        room.once('destroy', () => {
          // @ts-expect-error
          state.rooms[id] = undefined
          state.roomSessionId = ''

          destroyCallback?.()
        })

        resolve(room)
      }

      // TODO: add timeout
    })
  })
}

export {
  // valtio
  subscribe,
  watch,
  subscribeKey,

  // Custom
  state,
  getRoomSession,
  setRoomSession,
  onRoomSessionReady,
}
