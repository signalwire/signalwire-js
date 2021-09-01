import { connect, EventEmitter } from '@signalwire/core'
import { Room } from './Room'
import { ROOM_COMPONENT_LISTENERS } from './utils/constants'
import { configureJestStore } from './testUtils'

describe('Room Object', () => {
  let store: any
  let room: Room

  beforeEach(() => {
    store = configureJestStore()
    room = connect({
      store,
      Component: Room,
      componentListeners: ROOM_COMPONENT_LISTENERS,
    })({
      store,
      emitter: new EventEmitter(),
    })
    room.execute = jest.fn()

    // @ts-expect-error
    room._roomSessionId = 'room-session-id'
    // @ts-expect-error
    room._attachListeners(room.roomSessionId)
  })

  it('should have all the custom methods defined', () => {
    expect(room.audioMute).toBeDefined()
    expect(room.audioUnmute).toBeDefined()
    expect(room.videoMute).toBeDefined()
    expect(room.videoUnmute).toBeDefined()
    expect(room.deaf).toBeDefined()
    expect(room.undeaf).toBeDefined()
    expect(room.setMicrophoneVolume).toBeDefined()
    expect(room.setSpeakerVolume).toBeDefined()
    expect(room.setInputSensitivity).toBeDefined()
    expect(room.removeMember).toBeDefined()
    expect(room.getMembers).toBeDefined()
    expect(room.getLayouts).toBeDefined()
    expect(room.setLayout).toBeDefined()
    expect(room.hideVideoMuted).toBeDefined()
    expect(room.showVideoMuted).toBeDefined()
    expect(room.getRecordings).toBeDefined()
    expect(room.startRecording).toBeDefined()
  })

  describe('startRecording', () => {
    it('should return an interactive object', async () => {
      ;(room.execute as jest.Mock).mockResolvedValueOnce({
        code: '200',
        message: 'Recording started',
        recording_id: 'c22d7223-5a01-49fe-8da0-46bec8e75e32',
      })

      const recording = await room.startRecording()
      recording.execute = jest.fn()
      expect(recording.id).toEqual('c22d7223-5a01-49fe-8da0-46bec8e75e32')
      expect(recording.roomSessionId).toEqual('room-session-id')
      expect(recording.pause).toBeDefined()
      expect(recording.resume).toBeDefined()
      expect(recording.stop).toBeDefined()

      const baseExecuteParams = {
        method: '',
        params: {
          room_session_id: 'room-session-id',
          recording_id: 'c22d7223-5a01-49fe-8da0-46bec8e75e32',
        },
      }
      await recording.pause()
      expect(recording.execute).toHaveBeenLastCalledWith({
        ...baseExecuteParams,
        method: 'video.recording.pause',
      })
      await recording.resume()
      expect(recording.execute).toHaveBeenLastCalledWith({
        ...baseExecuteParams,
        method: 'video.recording.resume',
      })
      await recording.stop()
      expect(recording.execute).toHaveBeenLastCalledWith({
        ...baseExecuteParams,
        method: 'video.recording.stop',
      })
    })

    it('should work with simulataneous recordings', async () => {
      ;(room.execute as jest.Mock).mockResolvedValueOnce({
        code: '200',
        message: 'Recording started',
        recording_id: 'first-recording',
      })
      ;(room.execute as jest.Mock).mockResolvedValueOnce({
        code: '200',
        message: 'Recording started',
        recording_id: 'second-recording',
      })

      const firstRecording = await room.startRecording()
      firstRecording.execute = jest.fn()
      const secondRecording = await room.startRecording()
      secondRecording.execute = jest.fn()

      expect(firstRecording.id).toEqual('first-recording')
      expect(firstRecording.roomSessionId).toEqual('room-session-id')
      await firstRecording.stop()
      expect(firstRecording.execute).toHaveBeenLastCalledWith({
        method: 'video.recording.stop',
        params: {
          room_session_id: 'room-session-id',
          recording_id: 'first-recording',
        },
      })

      expect(secondRecording.id).toEqual('second-recording')
      expect(secondRecording.roomSessionId).toEqual('room-session-id')
      await secondRecording.stop()
      expect(secondRecording.execute).toHaveBeenLastCalledWith({
        method: 'video.recording.stop',
        params: {
          room_session_id: 'room-session-id',
          recording_id: 'second-recording',
        },
      })
    })
  })
})
