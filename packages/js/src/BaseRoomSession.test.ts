import { EventEmitter, actions } from '@signalwire/core'
import { createBaseRoomSessionObject } from './BaseRoomSession'
import type { RoomSession } from './RoomSession'
import { configureJestStore, configureFullStack } from './testUtils'

describe('Room Object', () => {
  let store: any
  let room: RoomSession

  beforeEach(() => {
    store = configureJestStore()
    room = createBaseRoomSessionObject<RoomSession>({
      store,
      emitter: new EventEmitter(),
    })
    // @ts-expect-error
    room.execute = jest.fn()
    // mock a room.subscribed event
    // @ts-expect-error
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

      room = createBaseRoomSessionObject({
        store,
        // @ts-expect-error
        emitter,
      })
      // mock a room.subscribed event
      // @ts-expect-error
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
      // @ts-expect-error
      ;(room.execute as jest.Mock).mockResolvedValueOnce({
        code: '200',
        message: 'Recording started',
        recording_id: 'c22d7223-5a01-49fe-8da0-46bec8e75e32',
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
        recording_id: 'first-recording',
      })
      // @ts-expect-error
      ;(room.execute as jest.Mock).mockResolvedValueOnce({
        code: '200',
        message: 'Recording started',
        recording_id: 'second-recording',
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

  describe('playback methods', () => {
    it('getPlaybacks should return an array of playbacks', async () => {
      const { store, session, emitter } = configureFullStack()
      const playbacks = [{ id: 'playbackOne' }, { id: 'playbackTwo' }]

      session.execute = jest.fn().mockResolvedValue({
        code: '200',
        message: 'OK',
        playbacks,
      })

      room = createBaseRoomSessionObject({
        store,
        // @ts-expect-error
        emitter,
      })
      // mock a room.subscribed event
      // @ts-expect-error
      room.onRoomSubscribed({
        nodeId: 'node-id',
        roomId: '6e83849b-5cc2-4fc6-80ed-448113c8a426',
        roomSessionId: '8e03ac25-8622-411a-95fc-f897b34ac9e7',
        memberId: 'member-id',
      })

      const result = await room.getPlaybacks()
      expect(result).toStrictEqual({
        playbacks,
      })
    })

    it('play should return an interactive object', async () => {
      // @ts-expect-error
      ;(room.execute as jest.Mock).mockResolvedValueOnce({
        code: '200',
        message: 'Playback started',
        playback: {
          id: 'c22d7223-5a01-49fe-8da0-46bec8e75e32',
          state: 'playing',
          started_at: 1234,
        },
      })

      const playback = await room.play({
        url: 'rtmp://jest.example.com/bla',
        volume: 5,
      })
      // @ts-expect-error
      playback.execute = jest.fn()

      // @ts-expect-error
      expect(room.execute).toHaveBeenLastCalledWith({
        method: 'video.playback.start',
        params: {
          room_session_id: 'room-session-id',
          url: 'rtmp://jest.example.com/bla',
          volume: 5,
        },
      })

      expect(playback.id).toEqual('c22d7223-5a01-49fe-8da0-46bec8e75e32')
      expect(playback.roomSessionId).toEqual('room-session-id')
      expect(playback.pause).toBeDefined()
      expect(playback.resume).toBeDefined()
      expect(playback.stop).toBeDefined()

      const baseExecuteParams = {
        method: '',
        params: {
          room_session_id: 'room-session-id',
          playback_id: 'c22d7223-5a01-49fe-8da0-46bec8e75e32',
        },
      }
      await playback.pause()
      // @ts-expect-error
      expect(playback.execute).toHaveBeenLastCalledWith({
        ...baseExecuteParams,
        method: 'video.playback.pause',
      })
      await playback.resume()
      // @ts-expect-error
      expect(playback.execute).toHaveBeenLastCalledWith({
        ...baseExecuteParams,
        method: 'video.playback.resume',
      })
      await playback.stop()
      // @ts-expect-error
      expect(playback.execute).toHaveBeenLastCalledWith({
        ...baseExecuteParams,
        method: 'video.playback.stop',
      })
      await playback.setVolume(30)
      // @ts-expect-error
      expect(playback.execute).toHaveBeenLastCalledWith({
        method: 'video.playback.set_volume',
        params: {
          room_session_id: 'room-session-id',
          playback_id: 'c22d7223-5a01-49fe-8da0-46bec8e75e32',
          volume: 30,
        },
      })
    })

    it('play should work with simulataneous playbacks', async () => {
      // @ts-expect-error
      ;(room.execute as jest.Mock).mockResolvedValueOnce({
        code: '200',
        message: 'Playback started',
        playback: {
          id: 'first-playback',
          state: 'playing',
          started_at: 1234,
        },
      })
      // @ts-expect-error
      ;(room.execute as jest.Mock).mockResolvedValueOnce({
        code: '200',
        message: 'Playback started',
        playback: {
          id: 'second-playback',
          state: 'playing',
          started_at: 1234,
        },
      })

      const firstPlayback = await room.play({
        url: 'url-one',
      })
      // @ts-expect-error
      firstPlayback.execute = jest.fn()
      const secondPlayback = await room.play({
        url: 'url-two',
      })
      // @ts-expect-error
      secondPlayback.execute = jest.fn()

      expect(firstPlayback.id).toEqual('first-playback')
      expect(firstPlayback.roomSessionId).toEqual('room-session-id')
      await firstPlayback.stop()
      // @ts-expect-error
      expect(firstPlayback.execute).toHaveBeenLastCalledWith({
        method: 'video.playback.stop',
        params: {
          room_session_id: 'room-session-id',
          playback_id: 'first-playback',
        },
      })

      expect(secondPlayback.id).toEqual('second-playback')
      expect(secondPlayback.roomSessionId).toEqual('room-session-id')
      await secondPlayback.stop()
      // @ts-expect-error
      expect(secondPlayback.execute).toHaveBeenLastCalledWith({
        method: 'video.playback.stop',
        params: {
          room_session_id: 'room-session-id',
          playback_id: 'second-playback',
        },
      })
    })
  })

  describe('as event emitter', () => {
    it('should listen on the talking events', () => {
      const { store, session, emitter } = configureFullStack()
      room = createBaseRoomSessionObject({
        store,
        // @ts-expect-error
        emitter,
      })
      // @ts-expect-error
      room.execute = jest.fn()
      // mock a room.subscribed event
      // @ts-expect-error
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
