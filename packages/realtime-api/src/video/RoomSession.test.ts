import { actions } from '@signalwire/core'
import { configureFullStack } from '../testUtils'
import { createVideoObject } from './Video'
import { createRoomSessionObject } from './RoomSession'

describe('RoomSession Object', () => {
  let roomSession: ReturnType<typeof createRoomSessionObject>
  const roomSessionId = 'roomSessionId'

  const { store, session, emitter } = configureFullStack()

  beforeEach(() => {
    // remove all listeners before each run
    emitter.removeAllListeners()

    return new Promise(async (resolve) => {
      const video = createVideoObject({
        store,
        // @ts-expect-error
        emitter,
      })
      // @ts-expect-error
      video.execute = jest.fn()

      video.on('room.started', async (newRoom) => {
        // @ts-expect-error
        newRoom.execute = jest.fn()

        roomSession = newRoom
        // @ts-expect-error
        roomSession._attachListeners(roomSessionId)
        resolve(roomSession)
      })
      // tweak "_eventsNamespace" using _attachListeners
      // @ts-expect-error
      video._attachListeners('')

      const eventChannelOne = 'room.<uuid-one>'
      const firstRoom = JSON.parse(
        `{"jsonrpc":"2.0","id":"uuid1","method":"signalwire.event","params":{"params":{"room":{"recording":false,"room_session_id":"${roomSessionId}","name":"First Room","hide_video_muted":false,"music_on_hold":false,"room_id":"room_id","event_channel":"${eventChannelOne}"},"room_session_id":"${roomSessionId}","room_id":"room_id","room_session":{"recording":false,"name":"First Room","hide_video_muted":false,"id":"${roomSessionId}","music_on_hold":false,"room_id":"room_id","event_channel":"${eventChannelOne}"}},"timestamp":1631692502.1308,"event_type":"video.room.started","event_channel":"video.rooms.4b7ae78a-d02e-4889-a63b-08b156d5916e"}}`
      )
      session.dispatch(actions.socketMessageAction(firstRoom))
    })
  })

  it('should have all the custom methods defined', () => {
    expect(roomSession.videoMute).toBeDefined()
    expect(roomSession.videoUnmute).toBeDefined()
    expect(roomSession.getMembers).toBeDefined()
    expect(roomSession.audioMute).toBeDefined()
    expect(roomSession.audioUnmute).toBeDefined()
    expect(roomSession.deaf).toBeDefined()
    expect(roomSession.undeaf).toBeDefined()
    expect(roomSession.setMicrophoneVolume).toBeDefined()
    expect(roomSession.setSpeakerVolume).toBeDefined()
    expect(roomSession.setInputSensitivity).toBeDefined()
    expect(roomSession.removeMember).toBeDefined()
    expect(roomSession.setHideVideoMuted).toBeDefined()
    expect(roomSession.getLayouts).toBeDefined()
    expect(roomSession.setLayout).toBeDefined()
    expect(roomSession.getRecordings).toBeDefined()
    expect(roomSession.startRecording).toBeDefined()
  })

  it('startRecording should return a recording object', async () => {
    // @ts-expect-error
    roomSession.execute = jest.fn().mockResolvedValue({
      recording_id: 'recordingId',
      room_session_id: roomSessionId,
      room_id: 'roomId',
      recording: {
        id: 'recordingId',
        state: 'recording',
      },
    })

    const recording = await roomSession.startRecording()

    // @ts-expect-error
    recording.execute = jest.fn()

    await recording.pause()
    // @ts-ignore
    expect(recording.execute).toHaveBeenLastCalledWith({
      method: 'video.recording.pause',
      params: {
        room_session_id: roomSessionId,
        recording_id: 'recordingId',
      },
    })
    await recording.resume()
    // @ts-ignore
    expect(recording.execute).toHaveBeenLastCalledWith({
      method: 'video.recording.resume',
      params: {
        room_session_id: roomSessionId,
        recording_id: 'recordingId',
      },
    })
    await recording.stop()
    // @ts-ignore
    expect(recording.execute).toHaveBeenLastCalledWith({
      method: 'video.recording.stop',
      params: {
        room_session_id: roomSessionId,
        recording_id: 'recordingId',
      },
    })
  })
})
