import { configureJestStore } from '../testUtils'
import { EventEmitter } from '../utils/EventEmitter'
import {
  createRoomSessionRTRecordingObject,
  RoomSessionRTRecording,
  RoomSessionRTRecordingEventsHandlerMapping,
} from './RoomSessionRTRecording'

describe('RoomSessionRTRecording', () => {
  describe('createRoomSessionRTRecordingObject', () => {
    let instance: RoomSessionRTRecording
    beforeEach(() => {
      instance = createRoomSessionRTRecordingObject({
        store: configureJestStore(),
        emitter: new EventEmitter<RoomSessionRTRecordingEventsHandlerMapping>(),
        payload: {
          // @ts-expect-error
          recording: {
            id: 'c22d7223-5a01-49fe-8da0-46bec8e75e32',
          },
          room_session_id: 'room-session-id',
        },
      })
      // @ts-expect-error
      instance.execute = jest.fn()
    })

    it('should control an active recording', async () => {
      const baseExecuteParams = {
        method: '',
        params: {
          room_session_id: 'room-session-id',
          recording_id: 'c22d7223-5a01-49fe-8da0-46bec8e75e32',
        },
      }
      await instance.pause()
      // @ts-expect-error
      expect(instance.execute).toHaveBeenLastCalledWith({
        ...baseExecuteParams,
        method: 'video.recording.pause',
      })
      await instance.resume()
      // @ts-expect-error
      expect(instance.execute).toHaveBeenLastCalledWith({
        ...baseExecuteParams,
        method: 'video.recording.resume',
      })
      await instance.stop()
      // @ts-expect-error
      expect(instance.execute).toHaveBeenLastCalledWith({
        ...baseExecuteParams,
        method: 'video.recording.stop',
      })
    })
  })
})
