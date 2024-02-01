import { configureJestStore } from '../testUtils'
import { BaseComponent } from '../BaseComponent'
import { EventEmitter } from '../utils/EventEmitter'
import { connect, SDKStore } from '../redux'
import * as CustomMethods from './methods'
import { RoomSessionRecordingAPI } from './RoomSessionRecording'

describe('Room Custom Methods', () => {
  let store: SDKStore
  let instance: any

  Object.defineProperties(BaseComponent.prototype, CustomMethods)

  beforeEach(() => {
    store = configureJestStore()
    instance = connect({
      store,
      Component: BaseComponent,
    })({
      emitter: new EventEmitter(),
    })
    instance.execute = jest.fn()
  })

  it('should have all the custom methods defined', () => {
    Object.keys(CustomMethods).forEach((method) => {
      expect(instance[method]).toBeDefined()
    })
  })

  describe('startRecording', () => {
    it('should return the raw payload w/o emitterTransforms', async () => {
      ;(instance.execute as jest.Mock).mockResolvedValueOnce({
        code: '200',
        message: 'Recording started',
        recording_id: 'c22d7223-5a01-49fe-8da0-46bec8e75e32',
        recording: {
          state: 'recording',
        },
      })
      instance.roomSessionId = 'mocked'

      const response = await instance.startRecording()
      expect(instance.execute).toHaveBeenCalledTimes(1)
      expect(instance.execute).toHaveBeenCalledWith({
        method: 'video.recording.start',
        params: {
          room_session_id: 'mocked',
        },
      })
      expect(response).toBeInstanceOf(RoomSessionRecordingAPI)
      expect(response.roomSessionId).toBe('mocked')
      expect(response.state).toBe('recording')
    })
  })

  describe('setLayout', () => {
    it('should execute with proper params', async () => {
      ;(instance.execute as jest.Mock).mockResolvedValueOnce({})
      instance.roomSessionId = 'mocked'

      await instance.setLayout({
        positions: {
          'c22d7124-5a01-49fe-8da0-46bec8e75f12': 'reserved',
        },
      })
      expect(instance.execute).toHaveBeenCalledTimes(1)
      expect(instance.execute).toHaveBeenCalledWith(
        {
          method: 'video.set_layout',
          params: {
            room_session_id: 'mocked',
            positions: {
              'c22d7124-5a01-49fe-8da0-46bec8e75f12': 'reserved',
            },
          },
        },
        {
          transformResolve: expect.anything(),
        }
      )
    })
  })

  describe('setPositions', () => {
    it('should execute with proper params', async () => {
      ;(instance.execute as jest.Mock).mockResolvedValueOnce({})
      instance.roomSessionId = 'mocked'

      await instance.setPositions({
        positions: {
          'cebecb3a-b9e4-499c-a707-0af96c110a04': 'auto',
          'aaaaaaa-b9e4-499c-a707-0af96c110a04': 'standard-1',
        },
      })
      expect(instance.execute).toHaveBeenCalledTimes(1)
      expect(instance.execute).toHaveBeenCalledWith(
        {
          method: 'video.set_position',
          params: {
            room_session_id: 'mocked',
            positions: {
              'cebecb3a-b9e4-499c-a707-0af96c110a04': 'auto',
              'aaaaaaa-b9e4-499c-a707-0af96c110a04': 'standard-1',
            },
          },
        },
        {
          transformResolve: expect.anything(),
        }
      )
    })
  })

  describe('setMemberPosition', () => {
    it('should execute with proper params', async () => {
      ;(instance.execute as jest.Mock).mockResolvedValueOnce({})
      instance.roomSessionId = 'mocked'

      await instance.setMemberPosition({
        member_id: 'cebecb3a-b9e4-499c-a707-0af96c110a04',
        position: 'auto',
      })
      expect(instance.execute).toHaveBeenCalledTimes(1)
      expect(instance.execute).toHaveBeenCalledWith(
        {
          method: 'video.member.set_position',
          params: {
            room_session_id: 'mocked',
            member_id: 'cebecb3a-b9e4-499c-a707-0af96c110a04',
            position: 'auto',
          },
        },
        {
          transformResolve: expect.anything(),
        }
      )
    })
  })

  describe('play', () => {
    beforeEach(() => {
      ;(instance.execute as jest.Mock).mockResolvedValueOnce({
        playback: {},
      })
    })

    it.each([
      {
        input: {
          positions: { 'c22d7124-5a01-49fe-8da0-46bec8e75f12': 'reserved' },
        },
        output: {
          positions: { 'c22d7124-5a01-49fe-8da0-46bec8e75f12': 'reserved' },
        },
      },
      { input: { seekPosition: 20000 }, output: { seek_position: 20000 } },
      { input: { currentTimecode: 10000 }, output: { seek_position: 10000 } },
    ])('should execute with proper params', async ({ input, output }) => {
      const url = 'https://example.com/foo.mp4'
      instance.roomSessionId = 'mocked'

      await instance.play({ url, ...input })
      expect(instance.execute).toHaveBeenCalledTimes(1)
      expect(instance.execute).toHaveBeenCalledWith({
        method: 'video.playback.start',
        params: {
          room_session_id: 'mocked',
          url,
          ...output,
        },
      })
    })
  })

  describe('promote', () => {
    it('should execute with proper params', async () => {
      ;(instance.execute as jest.Mock).mockResolvedValueOnce({})
      instance.roomSessionId = 'mocked'

      await instance.promote({
        memberId: 'c22d7124-5a01-49fe-8da0-46bec8e75f12',
        mediaAllowed: 'all',
        permissions: [
          'room.self.audio_mute',
          'room.self.audio_unmute',
          'room.self.video_mute',
          'room.self.video_unmute',
          'room.list_available_layouts',
        ],
      })

      expect(instance.execute).toHaveBeenCalledTimes(1)
      expect(instance.execute).toHaveBeenCalledWith(
        {
          method: 'video.member.promote',
          params: {
            room_session_id: 'mocked',
            member_id: 'c22d7124-5a01-49fe-8da0-46bec8e75f12',
            media_allowed: 'all',
            permissions: [
              'room.self.audio_mute',
              'room.self.audio_unmute',
              'room.self.video_mute',
              'room.self.video_unmute',
              'room.list_available_layouts',
            ],
          },
        },
        {
          transformResolve: expect.anything(),
        }
      )
    })
  })

  describe('demote', () => {
    it('should execute with proper params', async () => {
      ;(instance.execute as jest.Mock).mockResolvedValueOnce({})
      instance.roomSessionId = 'mocked'

      await instance.demote({
        memberId: 'c22d7124-5a01-49fe-8da0-46bec8e75f12',
        mediaAllowed: 'all',
      })

      expect(instance.execute).toHaveBeenCalledTimes(1)
      expect(instance.execute).toHaveBeenCalledWith(
        {
          method: 'video.member.demote',
          params: {
            room_session_id: 'mocked',
            member_id: 'c22d7124-5a01-49fe-8da0-46bec8e75f12',
            media_allowed: 'all',
          },
        },
        {
          transformResolve: expect.anything(),
        }
      )
    })
  })

  describe('setRaisedHand', () => {
    it.each([
      {
        input: {
          memberId: 'c22d7124-5a01-49fe-8da0-46bec8e75f12',
        },
        method: 'video.member.raisehand',
      },
      {
        input: {
          memberId: 'c22d7124-5a01-49fe-8da0-46bec8e75f12',
          raised: true,
        },
        method: 'video.member.raisehand',
      },
      {
        input: {
          memberId: 'c22d7124-5a01-49fe-8da0-46bec8e75f12',
          raised: false,
        },
        method: 'video.member.lowerhand',
      },
      {
        input: {},
        method: 'video.member.raisehand',
      },
    ])('should execute with proper params', async ({ input, method }) => {
      ;(instance.execute as jest.Mock).mockResolvedValueOnce({})
      instance.roomSessionId = 'mocked'
      instance.memberId = 'c22d7124-5a01-49fe-8da0-46bec8e75f12'

      await instance.setRaisedHand(input)

      expect(instance.execute).toHaveBeenCalledTimes(1)
      expect(instance.execute).toHaveBeenCalledWith(
        {
          method,
          params: {
            room_session_id: 'mocked',
            member_id: 'c22d7124-5a01-49fe-8da0-46bec8e75f12',
          },
        },
        {
          transformResolve: expect.anything(),
        }
      )
    })
  })

  describe('setPrioritizeHandraise', () => {
    it.each([true, false])(
      'should execute with proper params',
      async (enable) => {
        ;(instance.execute as jest.Mock).mockResolvedValueOnce({})
        instance.roomSessionId = 'mocked'

        await instance.setPrioritizeHandraise(enable)

        expect(instance.execute).toHaveBeenCalledTimes(1)
        expect(instance.execute).toHaveBeenCalledWith({
          method: 'video.prioritize_handraise',
          params: {
            room_session_id: 'mocked',
            enable,
          },
        })
      }
    )
  })
})
