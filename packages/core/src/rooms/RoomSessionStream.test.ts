import { configureJestStore } from '../testUtils'
import {
  createRoomSessionStreamObject,
  RoomSessionStream,
} from './RoomSessionStream'

describe('RoomSessionStream', () => {
  describe('createRoomSessionStreamObject', () => {
    let instance: RoomSessionStream
    beforeEach(() => {
      instance = createRoomSessionStreamObject({
        store: configureJestStore(),
        payload: {
          // @ts-expect-error
          stream: {
            id: 'c22d7223-5a01-49fe-8da0-46bec8e75e32',
          },
          room_session_id: 'room-session-id',
        },
      })
      // @ts-expect-error
      instance.execute = jest.fn()
    })

    it('should control an active stream', async () => {
      const baseExecuteParams = {
        method: '',
        params: {
          room_session_id: 'room-session-id',
          stream_id: 'c22d7223-5a01-49fe-8da0-46bec8e75e32',
        },
      }

      await instance.stop()
      // @ts-expect-error
      expect(instance.execute).toHaveBeenLastCalledWith({
        ...baseExecuteParams,
        method: 'video.stream.stop',
      })
    })
  })
})
