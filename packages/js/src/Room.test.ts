import { connect, EventEmitter, actions } from '@signalwire/core'
import { Room } from './Room'
import { ROOM_COMPONENT_LISTENERS } from './utils/constants'
import { configureJestStore, configureFullStack } from './testUtils'
import type { RoomObject } from './utils/interfaces'

describe('Room Object', () => {
  let store: any
  let room: RoomObject

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
    // mock a room.subscribed event
    room.onRoomSubscribed({
      nodeId: 'node-id',
      roomId: 'room-id',
      roomSessionId: 'room-session-id',
      memberId: 'member-id',
    })
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

  describe('getRecordings', () => {
    it('should return an array of recordings', async () => {
      const { store, session, emitter } = configureFullStack()
      const recordingList = [{ id: 'recordingOne' }, { id: 'recordingTwo' }]

      session.execute = jest.fn().mockResolvedValue({
        code: '200',
        message: 'OK',
        recordings: recordingList,
      })

      room = connect({
        store,
        Component: Room,
        componentListeners: ROOM_COMPONENT_LISTENERS,
      })({
        store,
        emitter,
      })
      // mock a room.subscribed event
      room.onRoomSubscribed({
        nodeId: 'node-id',
        roomId: '6e83849b-5cc2-4fc6-80ed-448113c8a426',
        roomSessionId: '8e03ac25-8622-411a-95fc-f897b34ac9e7',
        memberId: 'member-id',
      })

      const result = await room.getRecordings()
      expect(result).toStrictEqual({
        recordings: recordingList,
      })
    })
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

  describe('as event emitter', () => {
    it('should listen on the talking events', () => {
      const { store, session, emitter } = configureFullStack()
      room = connect({
        store,
        Component: Room,
        componentListeners: ROOM_COMPONENT_LISTENERS,
      })({
        store,
        emitter,
      })
      room.execute = jest.fn()
      // mock a room.subscribed event
      room.onRoomSubscribed({
        nodeId: 'node-id',
        roomId: '6e83849b-5cc2-4fc6-80ed-448113c8a426',
        roomSessionId: '8e03ac25-8622-411a-95fc-f897b34ac9e7',
        memberId: 'member-id',
      })

      const startedHandler = jest.fn()
      room.on('member.talking.started', startedHandler)
      // deprecated
      room.on('member.talking.start', startedHandler)

      const endedHandler = jest.fn()
      room.on('member.talking.ended', endedHandler)
      // deprecated
      room.on('member.talking.stop', endedHandler)

      const globalHandler = jest.fn()
      room.on('member.talking', globalHandler)

      const talkingTrue = JSON.parse(
        '{"jsonrpc":"2.0","id":"9050e4f8-b08e-4e39-9796-bfb6e83c2a2d","method":"signalwire.event","params":{"params":{"room_session_id":"8e03ac25-8622-411a-95fc-f897b34ac9e7","room_id":"6e83849b-5cc2-4fc6-80ed-448113c8a426","member":{"id":"a3693340-6f42-4cab-b18e-8e2a22695698","room_session_id":"8e03ac25-8622-411a-95fc-f897b34ac9e7","room_id":"6e83849b-5cc2-4fc6-80ed-448113c8a426","talking":true}},"timestamp":1627374612.9585,"event_type":"video.member.talking","event_channel":"room.0a324e3c-5e2f-443a-a333-10bf005f249e"}}'
      )
      session.dispatch(actions.socketMessageAction(talkingTrue))

      expect(startedHandler).toHaveBeenCalledTimes(2)
      expect(globalHandler).toHaveBeenCalledTimes(1)

      const talkingFalse = JSON.parse(
        '{"jsonrpc":"2.0","id":"9050e4f8-b08e-4e39-9796-bfb6e83c2a2d","method":"signalwire.event","params":{"params":{"room_session_id":"8e03ac25-8622-411a-95fc-f897b34ac9e7","room_id":"6e83849b-5cc2-4fc6-80ed-448113c8a426","member":{"id":"a3693340-6f42-4cab-b18e-8e2a22695698","room_session_id":"8e03ac25-8622-411a-95fc-f897b34ac9e7","room_id":"6e83849b-5cc2-4fc6-80ed-448113c8a426","talking":false}},"timestamp":1627374612.9585,"event_type":"video.member.talking","event_channel":"room.0a324e3c-5e2f-443a-a333-10bf005f249e"}}'
      )
      session.dispatch(actions.socketMessageAction(talkingFalse))

      expect(endedHandler).toHaveBeenCalledTimes(2)
      expect(globalHandler).toHaveBeenCalledTimes(2)

      expect(globalHandler).toHaveBeenNthCalledWith(
        1,
        talkingTrue.params.params
      )
      expect(globalHandler).toHaveBeenNthCalledWith(
        2,
        talkingFalse.params.params
      )
    })
  })
})
