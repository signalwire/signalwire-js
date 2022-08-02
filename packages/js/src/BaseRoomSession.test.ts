import { EventEmitter, actions, componentActions } from '@signalwire/core'
import { BaseRoomSession, createBaseRoomSessionObject } from './BaseRoomSession'
import type { RoomSession } from './RoomSession'
import { configureFullStack, dispatchMockedRoomSubscribed } from './testUtils'

describe('Room Object', () => {
  let store: any
  let room: BaseRoomSession<RoomSession>
  let stack: ReturnType<typeof configureFullStack>
  const callId = 'call-id'

  const setupRoomForTests = () => {
    const mockPeer = {
      uuid: callId,
      onRemoteSdp: jest.fn(),
    }
    // @ts-expect-error
    room.getRTCPeerById = jest.fn((_id: string) => mockPeer)

    // @ts-expect-error
    room.runRTCPeerWorkers(callId)
  }

  beforeEach(() => {
    stack = configureFullStack()
    store = stack.store
    room = createBaseRoomSessionObject<RoomSession>({
      store,
      emitter: new EventEmitter(),
    })
    store.dispatch(
      componentActions.upsert({
        id: callId,
        nodeId: 'node-id',
        roomId: 'room-id',
        roomSessionId: 'room-session-id',
        memberId: 'member-id',
      })
    )
    // @ts-expect-error
    room.execute = jest.fn()

    setupRoomForTests()

    // mock a room.subscribed event
    dispatchMockedRoomSubscribed({
      session: stack.session,
      callId,
      roomId: 'room-id',
      roomSessionId: 'room-session-id',
      memberId: 'member-id',
    })
  })

  afterEach(() => {
    stack.destroy()
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
      store.dispatch(
        componentActions.upsert({
          id: callId,
          nodeId: 'node-id',
          roomId: '6e83849b-5cc2-4fc6-80ed-448113c8a426',
          roomSessionId: '8e03ac25-8622-411a-95fc-f897b34ac9e7',
          memberId: 'member-id',
        })
      )
      // mock a room.subscribed event
      dispatchMockedRoomSubscribed({
        session,
        callId,
        roomId: '6e83849b-5cc2-4fc6-80ed-448113c8a426',
        roomSessionId: '8e03ac25-8622-411a-95fc-f897b34ac9e7',
        memberId: 'member-id',
      })

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
      expect(room.execute).toHaveBeenLastCalledWith({
        method: 'video.recording.start',
        params: {
          room_session_id: 'room-session-id',
        },
      })

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

  describe('playback methods', () => {
    it('getPlaybacks should return an array of playbacks', async () => {
      const { store, session, emitter, destroy } = configureFullStack()
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
      store.dispatch(
        componentActions.upsert({
          id: callId,
          nodeId: 'node-id',
          roomId: '6e83849b-5cc2-4fc6-80ed-448113c8a426',
          roomSessionId: '8e03ac25-8622-411a-95fc-f897b34ac9e7',
          memberId: 'member-id',
        })
      )
      // mock a room.subscribed event
      dispatchMockedRoomSubscribed({
        session,
        callId,
        roomId: '6e83849b-5cc2-4fc6-80ed-448113c8a426',
        roomSessionId: '8e03ac25-8622-411a-95fc-f897b34ac9e7',
        memberId: 'member-id',
      })

      const result = await room.getPlaybacks()
      expect(result).toStrictEqual({
        playbacks,
      })

      destroy()
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
      const { store, session, emitter, destroy } = configureFullStack()
      room = createBaseRoomSessionObject({
        store,
        // @ts-expect-error
        emitter,
      })
      // @ts-expect-error
      room.execute = jest.fn()
      store.dispatch(
        componentActions.upsert({
          id: callId,
          nodeId: 'node-id',
          roomId: '6e83849b-5cc2-4fc6-80ed-448113c8a426',
          roomSessionId: '8e03ac25-8622-411a-95fc-f897b34ac9e7',
          memberId: 'member-id',
        })
      )

      setupRoomForTests()

      // mock a room.subscribed event
      dispatchMockedRoomSubscribed({
        session,
        callId,
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
      destroy()
    })

    it('should handle the room.subscribed event with nested fields', (done) => {
      const roomId = 'd8caec4b-ddc9-4806-b2d0-e7c7d5cefe79'
      const roomSessionId = '638a54a7-61d8-4db0-bc24-426aee5cebcd'
      const recordingId = 'd1ae1822-5a5d-4950-8693-e59dc5dd96e0'
      const memberId = '465ea212-c456-423b-9bcc-838c5e1b2851'

      const { store, session, emitter, destroy } = configureFullStack()
      room = createBaseRoomSessionObject({
        store,
        // @ts-expect-error
        emitter,
      })
      // @ts-expect-error
      room.execute = jest.fn()

      setupRoomForTests()

      // const startedHandler = jest.fn()
      room.on('room.joined', (params) => {
        /** Test same keys between room_session and room for backwards compat. */
        const keys = ['room_session', 'room'] as const
        keys.forEach(async (key) => {
          expect(params[key].name).toEqual('bu')
          expect(params[key].room_id).toEqual(roomId)
          expect(params[key].recording).toBe(true)
          expect(params[key].hide_video_muted).toBe(false)
          // @ts-expect-error
          expect(params[key].meta).toStrictEqual({})
          // @ts-expect-error
          const { members, recordings } = params[key]

          // Test members and member object
          expect(members).toHaveLength(1)
          expect(members[0].id).toEqual(memberId)
          expect(members[0].name).toEqual('edo')
          expect(members[0].visible).toEqual(false)
          expect(members[0].audio_muted).toEqual(false)
          expect(members[0].video_muted).toEqual(false)
          expect(members[0].deaf).toEqual(false)
          expect(members[0].input_volume).toEqual(0)
          expect(members[0].output_volume).toEqual(0)
          expect(members[0].input_sensitivity).toEqual(11.11111111111111)
          expect(members[0].meta).toStrictEqual({})

          // Test recordings and recording object
          expect(recordings).toHaveLength(1)
          const recordingObj = recordings[0]
          expect(recordingObj.id).toEqual(recordingId)
          expect(recordingObj.state).toEqual('recording')
          expect(recordingObj.duration).toBeNull()
          expect(recordingObj.startedAt).toBeInstanceOf(Date)
          expect(recordingObj.endedAt).toBeInstanceOf(Date)

          const execMock = jest.fn()
          const _clearMock = () => {
            execMock.mockClear()
            recordingObj.execute = execMock
          }
          _clearMock()
          await recordingObj.pause()
          expect(execMock).toHaveBeenCalledTimes(1)
          expect(execMock).toHaveBeenCalledWith({
            method: 'video.recording.pause',
            params: {
              recording_id: recordingId,
              room_session_id: roomSessionId,
            },
          })

          _clearMock()
          await recordingObj.resume()
          expect(execMock).toHaveBeenCalledTimes(1)
          expect(execMock).toHaveBeenCalledWith({
            method: 'video.recording.resume',
            params: {
              recording_id: recordingId,
              room_session_id: roomSessionId,
            },
          })

          _clearMock()
          await recordingObj.stop()
          expect(execMock).toHaveBeenCalledTimes(1)
          expect(execMock).toHaveBeenCalledWith({
            method: 'video.recording.stop',
            params: {
              recording_id: recordingId,
              room_session_id: roomSessionId,
            },
          })
        })
        /** Test specific keys between room_session and room for backwards compat. */
        expect(params.room.room_session_id).toEqual(roomSessionId)
        expect(params.room_session.id).toEqual(roomSessionId)

        /** Test RoomSession properties */
        expect(room.roomId).toEqual(roomId)
        expect(room.roomSessionId).toEqual(roomSessionId)
        expect(room.memberId).toEqual(memberId)

        destroy()
        done()
      })

      /**
       * Mock `call_id` to match the event with "room.__uuid"
       */
      const roomSubscribed = JSON.parse(
        `{"jsonrpc":"2.0","id":"d8a9fb9a-ad28-4a0a-8caa-5e06ec22f856","method":"signalwire.event","params":{"event_type":"video.room.subscribed","timestamp":1650960870.216,"event_channel":"EC_4d2c491d-bf96-4802-9008-c360a51155a2","params":{"call_id":"${callId}","member_id":"465ea212-c456-423b-9bcc-838c5e1b2851","room_session":{"room_id":"d8caec4b-ddc9-4806-b2d0-e7c7d5cefe79","id":"638a54a7-61d8-4db0-bc24-426aee5cebcd","event_channel":"EC_4d2c491d-bf96-4802-9008-c360a51155a2","name":"bu","recording":true,"hide_video_muted":false,"display_name":"bu","meta":{},"recordings":[{"id":"d1ae1822-5a5d-4950-8693-e59dc5dd96e0","state":"recording","duration":null,"started_at":1650960870.033,"ended_at":null}],"members":[{"id":"465ea212-c456-423b-9bcc-838c5e1b2851","room_id":"d8caec4b-ddc9-4806-b2d0-e7c7d5cefe79","room_session_id":"638a54a7-61d8-4db0-bc24-426aee5cebcd","name":"edo","type":"member","parent_id":"","requested_position":"auto","visible":false,"audio_muted":false,"video_muted":false,"deaf":false,"input_volume":0,"output_volume":0,"input_sensitivity":11.11111111111111,"meta":{}}]},"room":{"room_id":"d8caec4b-ddc9-4806-b2d0-e7c7d5cefe79","event_channel":"EC_4d2c491d-bf96-4802-9008-c360a51155a2","name":"bu","recording":true,"hide_video_muted":false,"display_name":"bu","meta":{},"recordings":[{"id":"d1ae1822-5a5d-4950-8693-e59dc5dd96e0","state":"recording","duration":null,"started_at":1650960870.033,"ended_at":null}],"members":[{"id":"465ea212-c456-423b-9bcc-838c5e1b2851","room_id":"d8caec4b-ddc9-4806-b2d0-e7c7d5cefe79","room_session_id":"638a54a7-61d8-4db0-bc24-426aee5cebcd","name":"edo","type":"member","parent_id":"","requested_position":"auto","visible":false,"audio_muted":false,"video_muted":false,"deaf":false,"input_volume":0,"output_volume":0,"input_sensitivity":11.11111111111111,"meta":{}}],"room_session_id":"638a54a7-61d8-4db0-bc24-426aee5cebcd"}}}}`
      )
      // mock a room.subscribed event
      session.dispatch(actions.socketMessageAction(roomSubscribed))
    })
  })

  describe('meta methods', () => {
    it('should allow to set the meta field on the RoomSession', async () => {
      const { store, session, emitter, destroy } = configureFullStack()

      session.execute = jest.fn().mockResolvedValue({
        code: '200',
        message: 'OK',
      })

      room = createBaseRoomSessionObject({
        store,
        // @ts-expect-error
        emitter,
      })
      store.dispatch(
        componentActions.upsert({
          id: callId,
          nodeId: 'node-id',
          roomId: '6e83849b-5cc2-4fc6-80ed-448113c8a426',
          roomSessionId: '8e03ac25-8622-411a-95fc-f897b34ac9e7',
          memberId: 'member-id',
        })
      )
      setupRoomForTests()
      // mock a room.subscribed event
      dispatchMockedRoomSubscribed({
        session,
        callId,
        roomId: '6e83849b-5cc2-4fc6-80ed-448113c8a426',
        roomSessionId: '8e03ac25-8622-411a-95fc-f897b34ac9e7',
        memberId: 'member-id',
      })

      const result = await room.setMeta({ foo: 'bar' })
      expect(result).toBeUndefined()

      expect(session.execute).toHaveBeenLastCalledWith({
        jsonrpc: '2.0',
        id: expect.any(String),
        method: 'video.set_meta',
        params: {
          room_session_id: '8e03ac25-8622-411a-95fc-f897b34ac9e7',
          meta: { foo: 'bar' },
        },
      })

      destroy()
    })

    it('should allow to set the meta field on the Member', async () => {
      const { store, session, emitter, destroy } = configureFullStack()

      session.execute = jest.fn().mockResolvedValue({
        code: '200',
        message: 'OK',
      })

      room = createBaseRoomSessionObject({
        store,
        // @ts-expect-error
        emitter,
      })
      store.dispatch(
        componentActions.upsert({
          id: callId,
          nodeId: 'node-id',
          roomId: '6e83849b-5cc2-4fc6-80ed-448113c8a426',
          roomSessionId: '8e03ac25-8622-411a-95fc-f897b34ac9e7',
          memberId: 'member-id',
        })
      )

      setupRoomForTests()

      // mock a room.subscribed event
      dispatchMockedRoomSubscribed({
        session,
        callId,
        roomId: '6e83849b-5cc2-4fc6-80ed-448113c8a426',
        roomSessionId: '8e03ac25-8622-411a-95fc-f897b34ac9e7',
        memberId: 'member-id',
      })

      const result = await room.setMemberMeta({
        memberId: 'uuid',
        meta: { displayName: 'jest' },
      })
      expect(result).toBeUndefined()

      expect(session.execute).toHaveBeenLastCalledWith({
        jsonrpc: '2.0',
        id: expect.any(String),
        method: 'video.member.set_meta',
        params: {
          room_session_id: '8e03ac25-8622-411a-95fc-f897b34ac9e7',
          member_id: 'uuid',
          meta: { displayName: 'jest' },
        },
      })

      destroy()
    })
  })
})
