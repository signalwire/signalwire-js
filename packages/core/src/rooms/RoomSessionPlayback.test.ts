import { configureJestStore } from '../testUtils'
import {
  createRoomSessionPlaybackObject,
  RoomSessionPlayback,
} from './RoomSessionPlayback'

describe('RoomSessionPlayback', () => {
  describe('createRoomSessionPlaybackObject', () => {
    let instance: RoomSessionPlayback
    beforeEach(() => {
      instance = createRoomSessionPlaybackObject({
        store: configureJestStore(),
        payload: {
          //@ts-expect-error
          playback: {
            id: 'c22d7223-5a01-49fe-8da0-46bec8e75e32',
          },
          room_session_id: 'room-session-id',
        },
      })
      // @ts-expect-error
      instance.execute = jest.fn()
    })

    it('should control an active playback', async () => {
      const baseExecuteParams = {
        method: '',
        params: {
          room_session_id: 'room-session-id',
          playback_id: 'c22d7223-5a01-49fe-8da0-46bec8e75e32',
        },
      }
      await instance.pause()
      // @ts-expect-error
      expect(instance.execute).toHaveBeenLastCalledWith({
        ...baseExecuteParams,
        method: 'video.playback.pause',
      })
      await instance.resume()
      // @ts-expect-error
      expect(instance.execute).toHaveBeenLastCalledWith({
        ...baseExecuteParams,
        method: 'video.playback.resume',
      })
      await instance.stop()
      // @ts-expect-error
      expect(instance.execute).toHaveBeenLastCalledWith({
        ...baseExecuteParams,
        method: 'video.playback.stop',
      })
      await instance.setVolume(30)
      // @ts-expect-error
      expect(instance.execute).toHaveBeenLastCalledWith({
        method: 'video.playback.set_volume',
        params: {
          room_session_id: 'room-session-id',
          playback_id: 'c22d7223-5a01-49fe-8da0-46bec8e75e32',
          volume: 30,
        },
      })
    })
  })
})
