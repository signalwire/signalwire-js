import { configureJestStore } from '../testUtils'
import { EventEmitter } from '../utils/EventEmitter'
import {
  createRoomSessionRecordingObject,
  RoomSessionRecordingAPI,
  RoomSessionRecordingEventsHandlerMapping,
} from './RoomSessionRecording'

describe('RoomSessionRecording', () => {
  describe('createRoomSessionRecordingObject', () => {
    let instance: RoomSessionRecordingAPI
    beforeEach(() => {
      instance = createRoomSessionRecordingObject({
        store: configureJestStore(),
        emitter: new EventEmitter<RoomSessionRecordingEventsHandlerMapping>(),
      })
      instance.execute = jest.fn()
    })

    it('should control an active recording', async () => {
      // Mock properties
      // @ts-expect-error
      instance.id = 'c22d7223-5a01-49fe-8da0-46bec8e75e32'
      // @ts-expect-error
      instance.roomSessionId = 'room-session-id'

      const baseExecuteParams = {
        method: '',
        params: {
          room_session_id: 'room-session-id',
          recording_id: 'c22d7223-5a01-49fe-8da0-46bec8e75e32',
        },
      }
      await instance.pause()
      expect(instance.execute).toHaveBeenLastCalledWith({
        ...baseExecuteParams,
        method: 'video.recording.pause',
      })
      await instance.resume()
      expect(instance.execute).toHaveBeenLastCalledWith({
        ...baseExecuteParams,
        method: 'video.recording.resume',
      })
      await instance.stop()
      expect(instance.execute).toHaveBeenLastCalledWith({
        ...baseExecuteParams,
        method: 'video.recording.stop',
      })
    })
  })
})
