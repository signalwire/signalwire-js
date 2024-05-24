import { actions, componentActions } from '@signalwire/core'
import { configureFullStack, dispatchMockedCallJoined } from '../testUtils'
import {
  CallFabricRoomSession,
  CallFabricRoomSessionConnection,
  createCallFabricRoomSessionObject,
} from './CallFabricRoomSession'

describe('CallFabricRoomSession', () => {
  let store: any
  let room: CallFabricRoomSession & {
    execute: (params: any) => any
  }

  let stack: ReturnType<typeof configureFullStack>
  const callId = 'call-id-1'

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
    // @ts-expect-error
    room = createCallFabricRoomSessionObject({
      store,
      // @ts-expect-error
      emitter: stack.emitter,
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
    room.execute = jest.fn()

    setupRoomForTests()

    // mock a call.joined event
    dispatchMockedCallJoined({
      session: stack.session,
      callId: callId,
      roomId: 'room-id-1',
      roomSessionId: 'room-session-id-1',
      memberId: 'member-id-1',
      nodeId: 'node-id-1',
    })
    dispatchMockedCallJoined({
      session: stack.session,
      callId: 'call-id-2',
      roomId: 'room-id-2',
      roomSessionId: 'room-session-id-2',
      memberId: 'member-id-2',
      nodeId: 'node-id-2',
    })
  })

  afterEach(() => {
    stack.destroy()
  })

  describe('should use CallFabricRoomSessionConnection implementation', () => {
    const roomActionParams = {
      self: {
        call_id: 'call-id-1',
        member_id: 'member-id-1',
        node_id: 'node-id-1',
      },
    }
    const memberActionParams = {
      self: {
        call_id: 'call-id-1',
        member_id: 'member-id-1',
        node_id: 'node-id-1',
      },
      target: {
        call_id: 'call-id-2',
        member_id: 'member-id-2',
        node_id: 'node-id-2',
      },
    }

    test('audioMute implementation', async () => {
      const spy = jest.spyOn(
        CallFabricRoomSessionConnection.prototype,
        'audioMute'
      )
      await room.audioMute({ memberId: 'member-id-2' })
      expect(spy).toHaveBeenCalledWith({ memberId: 'member-id-2' })
      expect(room.execute).toHaveBeenCalledWith(
        {
          method: 'call.mute',
          params: {
            channels: ['audio'],
            ...memberActionParams,
          },
        },
        {}
      )
    })

    test('audioUnmute implementation', async () => {
      const spy = jest.spyOn(
        CallFabricRoomSessionConnection.prototype,
        'audioUnmute'
      )
      await room.audioUnmute({ memberId: 'member-id-2' })
      expect(spy).toHaveBeenCalledWith({ memberId: 'member-id-2' })
      expect(room.execute).toHaveBeenCalledWith(
        {
          method: 'call.unmute',
          params: {
            channels: ['audio'],
            ...memberActionParams,
          },
        },
        {}
      )
    })

    test('videoMute implementation', async () => {
      const spy = jest.spyOn(
        CallFabricRoomSessionConnection.prototype,
        'videoMute'
      )
      await room.videoMute({ memberId: 'member-id-2' })
      expect(spy).toHaveBeenCalledWith({ memberId: 'member-id-2' })
      expect(room.execute).toHaveBeenCalledWith(
        {
          method: 'call.mute',
          params: {
            channels: ['video'],
            ...memberActionParams,
          },
        },
        {}
      )
    })

    test('videoUnmute implementation', async () => {
      const spy = jest.spyOn(
        CallFabricRoomSessionConnection.prototype,
        'videoUnmute'
      )
      await room.videoUnmute({ memberId: 'member-id-2' })
      expect(spy).toHaveBeenCalledWith({ memberId: 'member-id-2' })
      expect(room.execute).toHaveBeenCalledWith(
        {
          method: 'call.unmute',
          params: {
            channels: ['video'],
            ...memberActionParams,
          },
        },
        {}
      )
    })

    test('deaf implementation', async () => {
      const spy = jest.spyOn(CallFabricRoomSessionConnection.prototype, 'deaf')
      await room.deaf({ memberId: 'member-id-2' })
      expect(spy).toHaveBeenCalledWith({ memberId: 'member-id-2' })
      expect(room.execute).toHaveBeenCalledWith(
        {
          method: 'call.deaf',
          params: {
            ...memberActionParams,
          },
        },
        {}
      )
    })

    test('undeaf implementation', async () => {
      const spy = jest.spyOn(
        CallFabricRoomSessionConnection.prototype,
        'undeaf'
      )
      await room.undeaf({ memberId: 'member-id-2' })
      expect(spy).toHaveBeenCalledWith({ memberId: 'member-id-2' })
      expect(room.execute).toHaveBeenCalledWith(
        {
          method: 'call.undeaf',
          params: {
            ...memberActionParams,
          },
        },
        {}
      )
    })

    test('getLayouts implementation', async () => {
      const spy = jest.spyOn(
        CallFabricRoomSessionConnection.prototype,
        'getLayouts'
      )
      await room.getLayouts()
      expect(spy).toHaveBeenCalledWith()
      expect(room.execute).toHaveBeenCalledWith(
        {
          method: 'call.layout.list',
          params: {
            ...roomActionParams,
          },
        },
        { transformResolve: expect.any(Function) }
      )
    })

    test('getMembers implementation', async () => {
      const spy = jest.spyOn(
        CallFabricRoomSessionConnection.prototype,
        'getMembers'
      )
      await room.getMembers()
      expect(spy).toHaveBeenCalledWith()
      expect(room.execute).toHaveBeenCalledWith(
        {
          method: 'call.member.list',
          params: {
            ...roomActionParams,
          },
        },
        { transformResolve: expect.any(Function) }
      )
    })

    test('removeMember implementation', async () => {
      const spy = jest.spyOn(
        CallFabricRoomSessionConnection.prototype,
        'removeMember'
      )
      await room.removeMember({ memberId: 'member-id-1' })
      expect(spy).toHaveBeenCalledWith({ memberId: 'member-id-1' })
      expect(room.execute).toHaveBeenCalledWith(
        {
          method: 'call.member.remove',
          params: {
            ...memberActionParams,
          },
        },
        {}
      )
    })

    test('setLayout implementation', async () => {
      const spy = jest.spyOn(
        CallFabricRoomSessionConnection.prototype,
        'setLayout'
      )
      await room.setLayout({ name: 'layout-1' })
      expect(spy).toHaveBeenCalledWith({ name: 'layout-1' })
      expect(room.execute).toHaveBeenCalledWith(
        {
          method: 'call.layout.set',
          params: {
            ...roomActionParams,
            name: 'layout-1',
            layout: undefined,
          },
        },
        {}
      )
    })

    test('setInputVolume implementation', async () => {
      const spy = jest.spyOn(
        CallFabricRoomSessionConnection.prototype,
        'setInputVolume'
      )
      await room.setInputVolume({ volume: 10 })
      expect(spy).toHaveBeenCalledWith({ volume: 10 })
      expect(room.execute).toHaveBeenCalledWith(
        {
          method: 'call.microphone.volume.set',
          params: {
            ...memberActionParams,
            volume: 10,
          },
        },
        {}
      )
    })

    test('setOutputVolume implementation', async () => {
      const spy = jest.spyOn(
        CallFabricRoomSessionConnection.prototype,
        'setOutputVolume'
      )
      await room.setOutputVolume({ volume: 10 })
      expect(spy).toHaveBeenCalledWith({ volume: 10 })
      expect(room.execute).toHaveBeenCalledWith(
        {
          method: 'video.member.set_output_volume',
          params: {
            ...memberActionParams,
            volume: 10,
          },
        },
        {}
      )
    })

    test('setInputSensitivity implementation', async () => {
      const spy = jest.spyOn(
        CallFabricRoomSessionConnection.prototype,
        'setInputSensitivity'
      )
      await room.setInputSensitivity({ value: 10 })
      expect(spy).toHaveBeenCalledWith({ value: 10 })
      expect(room.execute).toHaveBeenCalledWith(
        {
          method: 'call.microphone.sensitivity.set',
          params: {
            ...memberActionParams,
            value: 10,
          },
        },
        {}
      )
    })
  })

  describe('should handle call.joined event', () => {
    const roomId = 'd8caec4b-ddc9-4806-b2d0-e7c7d5cefe79'
    const roomSessionId = '638a54a7-61d8-4db0-bc24-426aee5cebcd'
    const memberId = '465ea212-c456-423b-9bcc-838c5e1b2851'

    it('should emit the room.subscribed event', (done) => {
      room.on('room.subscribed', async (params) => {
        expect(params.room_session.room_id).toEqual(roomId)
        expect(params.room_session.room_session_id).toEqual(roomSessionId)
        const { members, recordings, playbacks, streams } = params.room_session
        expect(members).toHaveLength(2)
        expect(members[0].member_id).toEqual(memberId)
        members.forEach((member) => {
          expect(member.visible).toEqual(true)
          expect(member.audio_muted).toEqual(false)
          expect(member.video_muted).toEqual(false)
          expect(member.deaf).toEqual(false)
          expect(member.meta).toStrictEqual({})
        })
        expect(recordings).toHaveLength(0)
        expect(playbacks).toHaveLength(0)
        expect(streams).toHaveLength(0)
        done()
      })

      dispatchMockedCallJoined({
        session: stack.session,
        callId: callId,
        roomId,
        roomSessionId,
        memberId,
        nodeId: 'node-id-random',
      })
    })

    it('should maintain callSegments array', () => {
      // Since two call.joined has already been dispatched two times in the beforeEach
      
      // FIXME update the expect to check the segmentWorkers instead of callSegments
      // expect(room.callSegments).toHaveLength(2)

      dispatchMockedCallJoined({
        session: stack.session,
        callId: callId,
        roomId: 'room-id-3',
        roomSessionId: 'room-session-id-3',
        memberId: 'member-id-3',
        nodeId: 'node-id-3',
      })

      // FIXME update the expect to check the segmentWorkers instead of callSegments
      // expect(room.callSegments).toHaveLength(3)

      const callLeft = JSON.parse(
        `{"jsonrpc":"2.0","id":"cb78f2eb-6468-48ed-979d-a94fca47befe","method":"signalwire.event","params":{"params":{"room_session":{"room_id":"${roomId}","room_session_id":"${roomSessionId}","event_channel":"signalwire_0c1c9852-b9d4-4a18-ba3b-eeafe1ffe504_13451811-bd4c-4646-b3ce-250581a7956e_94df1ecd-d073-473d-aa4d-a286e24f679b","layout_name":"1x1","meta":{},"members":[{"type":"member","call_id":"${callId}","member_id":"${memberId}","node_id":"6b706dc1-06ce-41db-8ad0-ad5c1c7f48d8@puc","name":"sip:foo@94df1ecd-d073-473d-aa4d-a286e24f679b.call.signalwire.com;context=private","room_id":"${roomId}","room_session_id":"${roomSessionId}","visible":true,"handraised":false,"audio_muted":false,"video_muted":false,"deaf":false,"meta":{}}],"recordings":[],"streams":[],"playbacks":[]},"room_id":"${roomId}","room_session_id":"${roomSessionId}","call_id":"${callId}","member_id":"${memberId}","node_id":"6b706dc1-06ce-41db-8ad0-ad5c1c7f48d8@puc"},"event_type":"call.left","event_channel":"signalwire_0c1c9852-b9d4-4a18-ba3b-eeafe1ffe504_13451811-bd4c-4646-b3ce-250581a7956e_94df1ecd-d073-473d-aa4d-a286e24f679b","timestamp":1712142454.67701}}`
      )
      stack.session.dispatch(actions.socketMessageAction(callLeft))

      // FIXME update the expect to check the segmentWorkers instead of callSegments
      // expect(room.callSegments).toHaveLength(2)
    })
  })

  describe('should use correct self and target', () => {
    it("should use current segment's memberId when provided with a self memberId from the previous segment", async () => {
      dispatchMockedCallJoined({
        session: stack.session,
        callId: 'call-id-3',
        roomId: 'room-id-3',
        roomSessionId: 'room-session-id-3',
        memberId: 'member-id-3',
        nodeId: 'node-id-3',
      })

      // FIXME update the expect to check the segmentWorkers instead of callSegments
      // expect(room.callSegments).toHaveLength(3)

      await room.audioMute({ memberId: 'member-id-2' })

      expect(room.execute).toHaveBeenCalledWith(
        {
          method: 'call.mute',
          params: {
            channels: ['audio'],
            self: {
              call_id: 'call-id-1',
              member_id: 'member-id-1',
              node_id: 'node-id-1',
            },
            target: {
              call_id: 'call-id-3',
              member_id: 'member-id-3',
              node_id: 'node-id-3',
            },
          },
        },
        {}
      )
    })

    it('should throw error for invalid memberId not present in the current segment and not a self memberId', async () => {
      dispatchMockedCallJoined({
        session: stack.session,
        callId: 'call-id-3',
        roomId: 'room-id-3',
        roomSessionId: 'room-session-id-3',
        memberId: 'member-id-3',
        memberId2: 'member-id-4',
        nodeId: 'node-id-3',
      })

      // FIXME update the expect to check the segmentWorkers instead of callSegments
      // expect(room.callSegments).toHaveLength(3)

      expect(async () => {
        await room.audioMute({ memberId: 'member-id-random' })
      }).rejects.toThrow(
        'The memberId is not a part of the current call segment!'
      )
    })
  })
})
