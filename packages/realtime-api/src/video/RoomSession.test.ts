import { actions } from '@signalwire/core'
import { configureFullStack } from '../testUtils'
import { Video } from './Video'
import { RoomSession } from './RoomSession'
import { createClient } from '../client/createClient'

describe('RoomSession Object', () => {
  let video: Video
  let roomSession: RoomSession
  const roomSessionId = 'roomSessionId'

  const { store, destroy } = configureFullStack()

  const userOptions = {
    host: 'example.com',
    project: 'example.project',
    token: 'example.token',
    store,
  }

  beforeEach(() => {
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

    return new Promise(async (resolve) => {
      await video.listen({
        onRoomStarted: (room) => {
          // @ts-expect-error
          room._client.execute = jest.fn()

          roomSession = room

          resolve(roomSession)
        },
      })

      const eventChannelOne = 'room.<uuid-one>'
      const firstRoom = JSON.parse(
        `{"jsonrpc":"2.0","id":"uuid1","method":"signalwire.event","params":{"params":{"room":{"recording":false,"room_session_id":"${roomSessionId}","name":"First Room","hide_video_muted":false,"music_on_hold":false,"room_id":"room_id","event_channel":"${eventChannelOne}"},"room_session_id":"${roomSessionId}","room_id":"room_id","room_session":{"recording":false,"name":"First Room","hide_video_muted":false,"id":"${roomSessionId}","music_on_hold":false,"room_id":"room_id","event_channel":"${eventChannelOne}"}},"timestamp":1631692502.1308,"event_type":"video.room.started","event_channel":"video.rooms.4b7ae78a-d02e-4889-a63b-08b156d5916e"}}`
      )

      // @ts-expect-error
      video._client.store.channels.sessionChannel.put(
        actions.socketMessageAction(firstRoom)
      )
    })
  })

  afterAll(() => {
    destroy()
  })

  it('should have all the custom methods defined', () => {
    expect(roomSession.videoMute).toBeDefined()
    expect(roomSession.videoUnmute).toBeDefined()
    expect(roomSession.getMembers).toBeDefined()
    expect(roomSession.audioMute).toBeDefined()
    expect(roomSession.audioUnmute).toBeDefined()
    expect(roomSession.deaf).toBeDefined()
    expect(roomSession.undeaf).toBeDefined()
    expect(roomSession.setInputVolume).toBeDefined()
    expect(roomSession.setOutputVolume).toBeDefined()
    expect(roomSession.setMicrophoneVolume).toBeDefined()
    expect(roomSession.setSpeakerVolume).toBeDefined()
    expect(roomSession.setInputSensitivity).toBeDefined()
    expect(roomSession.removeMember).toBeDefined()
    expect(roomSession.setHideVideoMuted).toBeDefined()
    expect(roomSession.getLayouts).toBeDefined()
    expect(roomSession.setLayout).toBeDefined()
    expect(roomSession.getRecordings).toBeDefined()
    expect(roomSession.startRecording).toBeDefined()
    expect(roomSession.getPlaybacks).toBeDefined()
    expect(roomSession.play).toBeDefined()
  })

  describe('getRecordings', () => {
    it('should return an array of recordings', async () => {
      const recordingList = [
        {
          id: '6dfd0d76-b68f-4eef-bdee-08100fe03f4e',
          state: 'completed',
          started_at: 1663858327.847,
          duration: 6.04,
          ended_at: 1663858334.343,
        },
        {
          id: 'e69d456b-4191-4dbb-8618-28d477734d65',
          state: 'recording',
          started_at: 1663858425.548,
        },
      ]

      // @ts-expect-error
      ;(roomSession._client.execute as jest.Mock).mockResolvedValueOnce({
        recordings: recordingList,
      })

      const { recordings } = await roomSession.getRecordings()
      recordings.forEach((recording, index) => {
        expect(recording.id).toEqual(recordingList[index].id)
        expect(recording.roomSessionId).toEqual(roomSessionId)
        expect(recording.state).toEqual(recordingList[index].state)
        expect(recording.startedAt).toEqual(
          new Date(recordingList[index].started_at! * 1000)
        )
        if (recordingList[index].ended_at) {
          expect(recording.endedAt).toEqual(
            new Date(recordingList[index].ended_at! * 1000)
          )
        }
        expect(typeof recording.pause).toBe('function')
        expect(typeof recording.resume).toBe('function')
        expect(typeof recording.stop).toBe('function')
      })
    })
  })

  it('startRecording should return a recording object', async () => {
    // @ts-expect-error
    roomSession._client.execute = jest.fn().mockResolvedValue({
      room_session_id: roomSessionId,
      room_id: 'roomId',
      recording: {
        id: 'recordingId',
        state: 'recording',
      },
    })

    const recording = await roomSession.startRecording()

    // @ts-expect-error
    recording._client.execute = jest.fn()

    await recording.pause()
    // @ts-ignore
    expect(recording._client.execute).toHaveBeenLastCalledWith({
      method: 'video.recording.pause',
      params: {
        room_session_id: roomSessionId,
        recording_id: 'recordingId',
      },
    })
    await recording.resume()
    // @ts-ignore
    expect(recording._client.execute).toHaveBeenLastCalledWith({
      method: 'video.recording.resume',
      params: {
        room_session_id: roomSessionId,
        recording_id: 'recordingId',
      },
    })
    await recording.stop()
    // @ts-ignore
    expect(recording._client.execute).toHaveBeenLastCalledWith({
      method: 'video.recording.stop',
      params: {
        room_session_id: roomSessionId,
        recording_id: 'recordingId',
      },
    })
  })

  describe('playback apis', () => {
    it('play() should return a playback object', async () => {
      // @ts-expect-error
      roomSession._client.execute = jest.fn().mockResolvedValue({
        room_session_id: roomSessionId,
        room_id: 'roomId',
        playback: {
          id: 'playbackId',
          state: 'playing',
          url: 'rtmp://example.com/foo',
          volume: 10,
          started_at: 1629460916,
        },
      })

      const playback = await roomSession.play({
        url: 'rtmp://example.com/foo',
        volume: 10,
      })

      // @ts-expect-error
      playback._client.execute = jest.fn()

      await playback.pause()
      // @ts-ignore
      expect(playback._client.execute).toHaveBeenLastCalledWith({
        method: 'video.playback.pause',
        params: {
          room_session_id: roomSessionId,
          playback_id: 'playbackId',
        },
      })
      await playback.resume()
      // @ts-ignore
      expect(playback._client.execute).toHaveBeenLastCalledWith({
        method: 'video.playback.resume',
        params: {
          room_session_id: roomSessionId,
          playback_id: 'playbackId',
        },
      })
      await playback.setVolume(20)
      // @ts-ignore
      expect(playback._client.execute).toHaveBeenLastCalledWith({
        method: 'video.playback.set_volume',
        params: {
          room_session_id: roomSessionId,
          playback_id: 'playbackId',
          volume: 20,
        },
      })
      await playback.stop()
      // @ts-ignore
      expect(playback._client.execute).toHaveBeenLastCalledWith({
        method: 'video.playback.stop',
        params: {
          room_session_id: roomSessionId,
          playback_id: 'playbackId',
        },
      })
    })
  })
})
