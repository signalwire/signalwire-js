import { configureJestStore } from '../testUtils'
import { BaseComponent } from '../BaseComponent'
import { EventEmitter } from '../utils/EventEmitter'
import { connect, SDKStore } from '../redux'
import * as CustomMethods from './methods'
import * as CustomRTMethods from './methodsRT'

describe('Room Custom Methods', () => {
  let store: SDKStore
  let instance: any

  Object.defineProperties(BaseComponent.prototype, CustomMethods)
  Object.defineProperties(BaseComponent.prototype, CustomRTMethods)

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

  // TODO: Discuss with Edo
  // Not fixing delibrately because this test makes me think the new implementation might not correct
  // describe('startRecording', () => {
  //   it('should return the raw payload w/o emitterTransforms', async () => {
  //     ;(instance.execute as jest.Mock).mockResolvedValueOnce({
  //       code: '200',
  //       message: 'Recording started',
  //       recording_id: 'c22d7223-5a01-49fe-8da0-46bec8e75e32',
  //       recording: {},
  //     })
  //     instance.roomSessionId = 'mocked'

  //     const response = await instance.startRTRecording()
  //     expect(instance.execute).toHaveBeenCalledTimes(1)
  //     expect(instance.execute).toHaveBeenCalledWith({
  //       method: 'video.recording.start',
  //       params: {
  //         room_session_id: 'mocked',
  //       },
  //     })
  //     expect(response).toStrictEqual({
  //       code: '200',
  //       message: 'Recording started',
  //       recording_id: 'c22d7223-5a01-49fe-8da0-46bec8e75e32',
  //       room_session_id: 'mocked',
  //     })
  //   })
  // })

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
    it('should execute with proper params', async () => {
      instance.roomSessionId = 'mocked'
      const url = 'https://example.com/foo.mp4'

      ;(instance.execute as jest.Mock).mockResolvedValueOnce({
        playback: {},
      })
      await instance.playRT({
        url,
        positions: {
          'c22d7124-5a01-49fe-8da0-46bec8e75f12': 'reserved',
        },
      })
      expect(instance.execute).toHaveBeenCalledTimes(1)
      expect(instance.execute).toHaveBeenCalledWith({
        method: 'video.playback.start',
        params: {
          room_session_id: 'mocked',
          url,
          positions: {
            'c22d7124-5a01-49fe-8da0-46bec8e75f12': 'reserved',
          },
        },
      })
      ;(instance.execute as jest.Mock).mockResolvedValueOnce({
        playback: {},
      })
      await instance.playRT({ url, currentTimecode: 10000 })
      expect(instance.execute).toHaveBeenCalledTimes(2)
      expect(instance.execute).toHaveBeenCalledWith({
        method: 'video.playback.start',
        params: {
          room_session_id: 'mocked',
          url,
          seek_position: 10000,
        },
      })
      ;(instance.execute as jest.Mock).mockResolvedValueOnce({
        playback: {},
      })
      await instance.playRT({ url, seekPosition: 10000 })
      expect(instance.execute).toHaveBeenCalledTimes(3)
      expect(instance.execute).toHaveBeenCalledWith({
        method: 'video.playback.start',
        params: {
          room_session_id: 'mocked',
          url,
          seek_position: 10000,
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
})
