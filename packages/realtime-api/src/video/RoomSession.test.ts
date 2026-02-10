import { actions } from '@signalwire/core'
import { configureFullStack } from '../testUtils'
import { Video } from './Video'
import { RoomSession } from './RoomSession'
import { createClient } from '../client/createClient'
import { RoomSessionRecording } from './RoomSessionRecording'
import { RoomSessionPlayback } from './RoomSessionPlayback'
import { RoomSessionStream } from './RoomSessionStream'

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

  afterEach(() => {
    jest.clearAllMocks()
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

  describe('Recording APIs', () => {
    let mockRecording: RoomSessionRecording

    beforeEach(() => {
      // @ts-expect-error
      roomSession._client.execute = jest.fn().mockResolvedValue()

      mockRecording = new RoomSessionRecording({
        roomSession,
        payload: {
          room_session_id: roomSessionId,
          // @ts-expect-error
          recording: {
            id: 'recordingId',
            state: 'recording',
          },
        },
      })
    })

    afterEach(() => {
      jest.clearAllMocks()
    })

    it('getRecordings should return an array of recordings', async () => {
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

    it('startRecording should return a recording object', async () => {
      // @ts-expect-error
      roomSession._client.execute = jest.fn().mockResolvedValue({})

      const recordingPromise = roomSession.startRecording()

      // @TODO: Mock server event
      roomSession.emit('recording.started', mockRecording)

      const recording = await recordingPromise.onStarted()

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

    it('should trigger recording and roomSession listeners', async () => {
      // @ts-expect-error
      roomSession._client.execute = jest.fn().mockResolvedValue()

      // Mock the listener
      const onStartedMock = jest.fn()
      const onUpdatedMock = jest.fn()
      const onEndedMock = jest.fn()

      const recordingPromise = roomSession.startRecording({
        listen: {
          onStarted: onStartedMock,
          onUpdated: onUpdatedMock,
          onEnded: onEndedMock,
        },
      })

      await roomSession.listen({
        onRecordingStarted: onStartedMock,
        onRecordingUpdated: onUpdatedMock,
        onRecordingEnded: onEndedMock,
      })

      // @TODO: Mock server event
      roomSession.emit('recording.started', mockRecording)
      roomSession.emit('recording.updated', mockRecording)
      roomSession.emit('recording.ended', mockRecording)

      await recordingPromise.onStarted()

      // Assertions
      expect(onStartedMock).toHaveBeenCalledTimes(2)
      expect(onUpdatedMock).toHaveBeenCalledTimes(2)
      expect(onEndedMock).toHaveBeenCalledTimes(2)
    })
  })

  describe('Playback APIs', () => {
    let mockPlayback: RoomSessionPlayback

    beforeEach(() => {
      // @ts-expect-error
      roomSession._client.execute = jest.fn().mockResolvedValue()

      mockPlayback = new RoomSessionPlayback({
        roomSession,
        payload: {
          room_session_id: roomSessionId,
          playback: {
            id: 'playbackId',
            state: 'playing',
            url: 'rtmp://example.com/foo',
            volume: 10,
            // @ts-expect-error
            started_at: 1629460916,
          },
        },
      })
    })

    afterEach(() => {
      jest.clearAllMocks()
    })

    it('getPlaybacks should return an array of playbacks', async () => {
      const playbackList = [
        {
          id: 'playbackId1',
          state: 'completed',
          started_at: 1663858327.847,
          ended_at: 1663858334.343,
        },
        {
          id: 'playbackId2',
          state: 'playing',
          started_at: 1663858425.548,
        },
      ]

      // @ts-expect-error
      ;(roomSession._client.execute as jest.Mock).mockResolvedValueOnce({
        playbacks: playbackList,
      })

      const { playbacks } = await roomSession.getPlaybacks()
      playbacks.forEach((playback, index) => {
        expect(playback.id).toEqual(playbackList[index].id)
        expect(playback.roomSessionId).toEqual(roomSessionId)
        expect(playback.state).toEqual(playbackList[index].state)
        expect(playback.startedAt).toEqual(
          new Date(playbackList[index].started_at! * 1000)
        )
        if (playbackList[index].ended_at) {
          expect(playback.endedAt).toEqual(
            new Date(playbackList[index].ended_at! * 1000)
          )
        }
        expect(typeof playback.pause).toBe('function')
        expect(typeof playback.resume).toBe('function')
        expect(typeof playback.stop).toBe('function')
        expect(typeof playback.setVolume).toBe('function')
        expect(typeof playback.seek).toBe('function')
        expect(typeof playback.forward).toBe('function')
        expect(typeof playback.rewind).toBe('function')
      })
    })

    it('play should return a playback object', async () => {
      const playbackPromise = roomSession.play({
        url: 'rtmp://example.com/foo',
        volume: 10,
      })

      // @TODO: Mock server event
      roomSession.emit('playback.started', mockPlayback)

      const playback = await playbackPromise.onStarted()

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

    it('should trigger playback and roomSession listeners', async () => {
      // @ts-expect-error
      roomSession._client.execute = jest.fn().mockResolvedValue()

      // Mock the listener
      const onStartedMock = jest.fn()
      const onUpdatedMock = jest.fn()
      const onEndedMock = jest.fn()

      await roomSession.listen({
        onPlaybackStarted: onStartedMock,
        onPlaybackUpdated: onUpdatedMock,
        onPlaybackEnded: onEndedMock,
      })

      const playbackPromise = roomSession.play({
        url: 'rtmp://example.com/foo',
        volume: 10,
        listen: {
          onStarted: onStartedMock,
          onUpdated: onUpdatedMock,
          onEnded: onEndedMock,
        },
      })

      // @TODO: Mock server event
      roomSession.emit('playback.started', mockPlayback)
      roomSession.emit('playback.updated', mockPlayback)
      roomSession.emit('playback.ended', mockPlayback)

      await playbackPromise.onStarted()

      // Assertions
      expect(onStartedMock).toHaveBeenCalledTimes(2)
      expect(onUpdatedMock).toHaveBeenCalledTimes(2)
      expect(onEndedMock).toHaveBeenCalledTimes(2)
    })
  })

  describe('Stream APIs', () => {
    let mockStream: RoomSessionStream

    beforeEach(() => {
      // @ts-expect-error
      roomSession._client.execute = jest.fn().mockResolvedValue()

      mockStream = new RoomSessionStream({
        roomSession,
        payload: {
          room_session_id: roomSessionId,
          // @ts-expect-error
          stream: {
            id: 'streamId',
            url: 'rtmp://example.com/foo',
            room_session_id: roomSessionId,
            state: 'streaming',
          },
        },
      })
    })

    afterEach(() => {
      jest.clearAllMocks()
    })

    it('getStreams should return an array of playbacks', async () => {
      const streamList = [
        {
          id: 'streamId1',
          state: 'completed',
          started_at: 1663858327.847,
          ended_at: 1663858334.343,
        },
        {
          id: 'streamId2',
          state: 'streaming',
          started_at: 1663858425.548,
        },
      ]

      // @ts-expect-error
      ;(roomSession._client.execute as jest.Mock).mockResolvedValueOnce({
        streams: streamList,
      })

      const { streams } = await roomSession.getStreams()
      streams.forEach((stream, index) => {
        expect(stream.id).toEqual(streamList[index].id)
        expect(stream.roomSessionId).toEqual(roomSessionId)
        expect(stream.state).toEqual(streamList[index].state)
        expect(stream.startedAt).toEqual(
          new Date(streamList[index].started_at! * 1000)
        )
        if (streamList[index].ended_at) {
          expect(stream.endedAt).toEqual(
            new Date(streamList[index].ended_at! * 1000)
          )
        }
        expect(typeof stream.stop).toBe('function')
      })
    })

    it('startStream should return a stream object', async () => {
      const streamPromise = roomSession.startStream({
        url: 'rtmp://example.com/foo',
      })

      // @TODO: Mock server event
      roomSession.emit('stream.started', mockStream)

      const stream = await streamPromise.onStarted()

      // @ts-expect-error
      stream._client.execute = jest.fn()

      await stream.stop()
      // @ts-ignore
      expect(stream._client.execute).toHaveBeenLastCalledWith({
        method: 'video.stream.stop',
        params: {
          room_session_id: roomSessionId,
          stream_id: 'streamId',
        },
      })
    })

    it('should trigger stream and roomSession listeners', async () => {
      // @ts-expect-error
      roomSession._client.execute = jest.fn().mockResolvedValue()

      // Mock the listener
      const onStartedMock = jest.fn()
      const onEndedMock = jest.fn()

      await roomSession.listen({
        onStreamStarted: onStartedMock,
        onStreamEnded: onEndedMock,
      })

      const streamPromise = roomSession.startStream({
        url: 'rtmp://example.com/foo',
        listen: {
          onStarted: onStartedMock,
          onEnded: onEndedMock,
        },
      })

      // @TODO: Mock server event
      roomSession.emit('stream.started', mockStream)
      roomSession.emit('stream.ended', mockStream)

      await streamPromise.onStarted()

      // Assertions
      expect(onStartedMock).toHaveBeenCalledTimes(2)
      expect(onEndedMock).toHaveBeenCalledTimes(2)
    })
  })
})
