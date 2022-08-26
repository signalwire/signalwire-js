import { configureJestStore } from '../testUtils'
import { EventEmitter } from '../utils/EventEmitter'
import {
  createRoomSessionStreamObject,
  RoomSessionStream,
  RoomSessionStreamEventsHandlerMapping,
} from './RoomSessionStream'

describe('RoomSessionStream', () => {
  describe('createRoomSessionStreamObject', () => {
    let instance: RoomSessionStream
    beforeEach(() => {
      instance = createRoomSessionStreamObject({
        store: configureJestStore(),
        emitter: new EventEmitter<RoomSessionStreamEventsHandlerMapping>(),
      })
      // @ts-expect-error
      instance.execute = jest.fn()
    })

    it('should control an active stream', async () => {
      // Mock properties
      instance.id = 'c22d7223-5a01-49fe-8da0-46bec8e75e32'
      instance.roomSessionId = 'room-session-id'

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
