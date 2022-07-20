import { EventEmitter, actions, componentActions } from '@signalwire/core'
import { BaseRoomSession, createBaseRoomSessionObject } from './BaseRoomSession'
import type { RoomSession } from './RoomSession'
import { configureJestStore, configureFullStack } from './testUtils'

describe('Room Object', () => {
  let store: any
  let room: BaseRoomSession<RoomSession>

  beforeEach(() => {
    store = configureJestStore()
    room = createBaseRoomSessionObject<RoomSession>({
      store,
      emitter: new EventEmitter(),
    })
    store.dispatch(componentActions.upsert({
      // @ts-expect-error
      id: room.id,
      nodeId: 'node-id',
      roomId: 'room-id',
      roomSessionId: 'room-session-id',
      memberId: 'member-id',
    }))
    // @ts-expect-error
    room.execute = jest.fn()
  })

  it('should have all the custom methods defined', () => {
    expect(room.audioMute).toBeDefined()
    expect(room.audioUnmute).toBeDefined()
    expect(room.videoMute).toBeDefined()
    expect(room.videoUnmute).toBeDefined()
    expect(room.deaf).toBeDefined()
    expect(room.undeaf).toBeDefined()
    expect(room.setInputVolume).toBeDefined()
    expect(room.setOutputVolume).toBeDefined()
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
    expect(room.getPlaybacks).toBeDefined()
    expect(room.play).toBeDefined()
    expect(room.setMeta).toBeDefined()
    expect(room.setMemberMeta).toBeDefined()
  })

  describe('getRecordings', () => {
    it('should return an array of recordings', async () => {
      const { store, session, emitter, destroy } = configureFullStack()
      const recordingList = [{ id: 'recordingOne' }, { id: 'recordingTwo' }]

      session.execute = jest.fn().mockResolvedValue({
        code: '200',
        message: 'OK',
        recordings: recordingList,
      })

      room = createBaseRoomSessionObject({
        store,
        // @ts-expect-error
        emitter,
      })
      store.dispatch(componentActions.upsert({
        // @ts-expect-error
        id: room.id,
        nodeId: 'node-id',
        roomId: '6e83849b-5cc2-4fc6-80ed-448113c8a426',
        roomSessionId: '8e03ac25-8622-411a-95fc-f897b34ac9e7',
        memberId: 'member-id',
      }))
      // mock a room.subscribed event
      store.runSaga(function* pepe({ channels }) {
        channels.swEventChannel.put({
          type: 'video.room.subscribed',
          payload: {
            // @ts-expect-error
            call_id: room.id,
            member_id: 'member-id',
            room_session: {
              id: '8e03ac25-8622-411a-95fc-f897b34ac9e7'
            }
          } as any
        })
      }, {} as any)

      const result = await room.getRecordings()
      expect(result).toStrictEqual({
        recordings: recordingList,
      })

      destroy()
    })
  })

  describe('startRecording', () => {
    it('should return an interactive object', async () => {
      // @ts-expect-error
      ;(room.execute as jest.Mock).mockResolvedValueOnce({
        code: '200',
        message: 'Recording started',
        recording: {
          id: 'c22d7223-5a01-49fe-8da0-46bec8e75e32',
        },
      })

      const recording = await room.startRecording()
      // @ts-expect-error
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
      // @ts-expect-error
      expect(recording.execute).toHaveBeenLastCalledWith({
        ...baseExecuteParams,
        method: 'video.recording.pause',
      })
      await recording.resume()
      // @ts-expect-error
      expect(recording.execute).toHaveBeenLastCalledWith({
        ...baseExecuteParams,
        method: 'video.recording.resume',
      })
      await recording.stop()
      // @ts-expect-error
      expect(recording.execute).toHaveBeenLastCalledWith({
        ...baseExecuteParams,
        method: 'video.recording.stop',
      })
    })

    it('should work with simulataneous recordings', async () => {
      // @ts-expect-error
      ;(room.execute as jest.Mock).mockResolvedValueOnce({
        code: '200',
        message: 'Recording started',
        recording: {
          id: 'first-recording',
        },
      })
      // @ts-expect-error
      ;(room.execute as jest.Mock).mockResolvedValueOnce({
        code: '200',
        message: 'Recording started',
        recording: {
          id: 'second-recording',
        },
      })

      const firstRecording = await room.startRecording()
      // @ts-expect-error
      firstRecording.execute = jest.fn()
      const secondRecording = await room.startRecording()
      // @ts-expect-error
      secondRecording.execute = jest.fn()

      expect(firstRecording.id).toEqual('first-recording')
      expect(firstRecording.roomSessionId).toEqual('room-session-id')
      await firstRecording.stop()
      // @ts-expect-error
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
      // @ts-expect-error
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
