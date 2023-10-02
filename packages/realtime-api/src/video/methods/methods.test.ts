import { SDKStore } from '@signalwire/core'
import { configureJestStore } from '../../testUtils'
import { createClient } from '../../client/createClient'
import { Video } from '../Video'
import { RoomSession, RoomSessionAPI } from '../RoomSession'
import * as CustomMethods from './methods'
import { RoomSessionRecording } from '../RoomSessionRecording'
import { RoomSessionPlayback } from '../RoomSessionPlayback'

describe('Room Custom Methods', () => {
  let video: Video
  let instance: any
  let store: SDKStore

  const roomSessionId = 'room-session-id'
  Object.defineProperties(RoomSession.prototype, CustomMethods)

  beforeEach(() => {
    store = configureJestStore()
    const userOptions = {
      host: 'example.com',
      project: 'example.project',
      token: 'example.token',
      store,
    }
    const swClientMock = {
      userOptions,
      client: createClient(userOptions),
    }
    // @ts-expect-error
    video = new Video(swClientMock)
    // @ts-expect-error
    video._client.execute = jest.fn()
    // @ts-expect-error
    video._client.runWorker = jest.fn()

    instance = new RoomSessionAPI({
      video,
      payload: {
        room_session: {
          id: roomSessionId,
          event_channel: 'room.e4b8baff-865d-424b-a210-4a182a3b1451',
        },
      },
    })
    instance._client.execute = jest.fn()
  })

  it('should have all the custom methods defined', () => {
    Object.keys(CustomMethods).forEach((method) => {
      expect(instance[method]).toBeDefined()
    })
  })

  describe('startRecording', () => {
    it('should return the raw payload w/o emitterTransforms', async () => {
      const recordingPayload = {
        id: 'recordingId',
        state: 'recording',
      }

      ;(instance._client.execute as jest.Mock).mockResolvedValueOnce({})

      const mockRecording = new RoomSessionRecording({
        roomSession: instance,
        payload: {
          room_session_id: roomSessionId,
          // @ts-expect-error
          recording: recordingPayload,
        },
      })

      const response = instance.startRecording()

      // @TODO: Mock server event
      instance.emit('recording.started', mockRecording)

      const recording = await response.onStarted()

      expect(instance._client.execute).toHaveBeenCalledTimes(1)
      expect(instance._client.execute).toHaveBeenCalledWith({
        method: 'video.recording.start',
        params: {
          room_session_id: roomSessionId,
        },
      })
      expect(recording).toBeInstanceOf(RoomSessionRecording)
      expect(recording.roomSessionId).toBe(roomSessionId)
      expect(recording.state).toBe('recording')
    })
  })

  describe('setLayout', () => {
    it('should execute with proper params', async () => {
      ;(instance._client.execute as jest.Mock).mockResolvedValueOnce({})
      await instance.setLayout({
        positions: {
          'c22d7124-5a01-49fe-8da0-46bec8e75f12': 'reserved',
        },
      })
      expect(instance._client.execute).toHaveBeenCalledTimes(1)
      expect(instance._client.execute).toHaveBeenCalledWith(
        {
          method: 'video.set_layout',
          params: {
            room_session_id: roomSessionId,
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
      ;(instance._client.execute as jest.Mock).mockResolvedValueOnce({})

      await instance.setPositions({
        positions: {
          'cebecb3a-b9e4-499c-a707-0af96c110a04': 'auto',
          'aaaaaaa-b9e4-499c-a707-0af96c110a04': 'standard-1',
        },
      })
      expect(instance._client.execute).toHaveBeenCalledTimes(1)
      expect(instance._client.execute).toHaveBeenCalledWith(
        {
          method: 'video.set_position',
          params: {
            room_session_id: roomSessionId,
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
      ;(instance._client.execute as jest.Mock).mockResolvedValueOnce({})

      await instance.setMemberPosition({
        member_id: 'cebecb3a-b9e4-499c-a707-0af96c110a04',
        position: 'auto',
      })
      expect(instance._client.execute).toHaveBeenCalledTimes(1)
      expect(instance._client.execute).toHaveBeenCalledWith(
        {
          method: 'video.member.set_position',
          params: {
            room_session_id: roomSessionId,
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
      ;(instance._client.execute as jest.Mock).mockResolvedValueOnce({
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

      const response = instance.play({ url, ...input })
      const mockPlayback = new RoomSessionPlayback({
        roomSession: instance,
        payload: {
          room_session_id: roomSessionId,
          // @ts-expect-error
          playback: {
            id: 'playbackId',
            state: 'playing',
            url: 'rtmp://example.com/foo',
          },
        },
      })
      instance.emit('playback.started', mockPlayback)
      await response.onStarted()

      expect(instance._client.execute).toHaveBeenCalledTimes(1)
      expect(instance._client.execute).toHaveBeenCalledWith({
        method: 'video.playback.start',
        params: {
          room_session_id: roomSessionId,
          url,
          ...output,
        },
      })
    })
  })

  describe('promote', () => {
    it('should execute with proper params', async () => {
      ;(instance._client.execute as jest.Mock).mockResolvedValueOnce({})

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

      expect(instance._client.execute).toHaveBeenCalledTimes(1)
      expect(instance._client.execute).toHaveBeenCalledWith(
        {
          method: 'video.member.promote',
          params: {
            room_session_id: roomSessionId,
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
      ;(instance._client.execute as jest.Mock).mockResolvedValueOnce({})

      await instance.demote({
        memberId: 'c22d7124-5a01-49fe-8da0-46bec8e75f12',
        mediaAllowed: 'all',
      })

      expect(instance._client.execute).toHaveBeenCalledTimes(1)
      expect(instance._client.execute).toHaveBeenCalledWith(
        {
          method: 'video.member.demote',
          params: {
            room_session_id: roomSessionId,
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
