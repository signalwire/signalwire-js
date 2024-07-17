import { JSONRPCRequest, actions, componentActions } from '@signalwire/core'
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
  const callJoinedHandler = jest.fn()

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

    //@ts-ignore
    room.on('call.joined', callJoinedHandler)
    
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
      roomSessionId: callId,
      memberId: 'member-id-1',
      nodeId: 'node-id-1',
      originCallId: callId,
    })
    dispatchMockedCallJoined({
      session: stack.session,
      callId: 'call-id-2',
      roomId: 'room-id-2',
      roomSessionId: 'call-id-2',
      memberId: 'member-id-2',
      nodeId: 'node-id-2',
      originCallId: callId,
    })
  })

  afterEach(() => {
    stack.destroy()
    callJoinedHandler.mockReset()
  })

  describe('should use CallFabricRoomSessionConnection implementation', () => {
    const actionParams = {
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
            ...actionParams,
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
            ...actionParams,
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
            ...actionParams,
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
            ...actionParams,
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
            ...actionParams,
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
            ...actionParams,
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
            ...actionParams,
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
            ...actionParams,
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
            ...actionParams,
            target: {
              call_id: 'call-id-1',
              member_id: 'member-id-1',
              node_id: 'node-id-1',
            },
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
            ...actionParams,
            layout: 'layout-1',
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
            ...actionParams,
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
            ...actionParams,
            volume: 10,
          },
        },
        {}
      )
    })

    test('lock implementation', async () => {
      const spy = jest.spyOn(
        CallFabricRoomSessionConnection.prototype,
        'lock'
      )
      await room.lock()
      expect(spy).toHaveBeenCalledWith()
      expect(room.execute).toHaveBeenCalledWith(
        {
          method: 'call.lock',
          params: {
            ...actionParams,
          },
        },
        {}
      )
    })

    test('unlock implementation', async () => {
      const spy = jest.spyOn(
        CallFabricRoomSessionConnection.prototype,
        'unlock'
      )
      await room.unlock()
      expect(spy).toHaveBeenCalledWith()
      expect(room.execute).toHaveBeenCalledWith(
        {
          method: 'call.unlock',
          params: {
            ...actionParams,
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
            ...actionParams,
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

    it('should maintain callSegments array', () => {
      // Since two call.joined has already been dispatched two times in the beforeEach

      expect(callJoinedHandler).toHaveBeenCalledTimes(2)

      dispatchMockedCallJoined({
        session: stack.session,
        callId: callId,
        roomId: 'room-id-3',
        roomSessionId: callId,
        memberId: 'member-id-3',
        nodeId: 'node-id-3',
        originCallId: callId,
      })

      expect(callJoinedHandler).toHaveBeenCalledTimes(3)

      const callLeft = JSON.parse(
        `{"jsonrpc":"2.0","id":"cb78f2eb-6468-48ed-979d-a94fca47befe","method":"signalwire.event","params":{"params":{"room_session":{"room_id":"${roomId}","room_session_id":"${roomSessionId}","event_channel":"signalwire_0c1c9852-b9d4-4a18-ba3b-eeafe1ffe504_13451811-bd4c-4646-b3ce-250581a7956e_94df1ecd-d073-473d-aa4d-a286e24f679b","layout_name":"1x1","meta":{},"members":[{"type":"member","call_id":"${callId}","member_id":"${memberId}","node_id":"6b706dc1-06ce-41db-8ad0-ad5c1c7f48d8@puc","name":"sip:foo@94df1ecd-d073-473d-aa4d-a286e24f679b.call.signalwire.com;context=private","room_id":"${roomId}","room_session_id":"${roomSessionId}","visible":true,"handraised":false,"audio_muted":false,"video_muted":false,"deaf":false,"meta":{}}],"recordings":[],"streams":[],"playbacks":[]},"room_id":"${roomId}","room_session_id":"${roomSessionId}","call_id":"${callId}","member_id":"${memberId}","node_id":"6b706dc1-06ce-41db-8ad0-ad5c1c7f48d8@puc"},"event_type":"call.left","event_channel":"signalwire_0c1c9852-b9d4-4a18-ba3b-eeafe1ffe504_13451811-bd4c-4646-b3ce-250581a7956e_94df1ecd-d073-473d-aa4d-a286e24f679b","timestamp":1712142454.67701}}`
      )
      stack.session.dispatch(actions.socketMessageAction(callLeft))

      // FIXME update the expect to check the segmentWorkers instead of callSegments
      // expect(room.callSegments).toHaveLength(2)
    })
  })

  describe('Emit events', () => {
    it('should emit events in order', () => {
      let talking
      let talkingStatus

      room.on('member.talking.started', () => (talkingStatus = 'started'))
      room.on('member.talking.ended', () => (talkingStatus = 'stoped'))
      room.on(
        'member.talking',
        (payload: any) => (talking = payload.member.talking)
      )

      const talkingTrue = {
        jsonrpc: '2.0',
        id: '2f260116-9447-4a16-a806-231137c2a111',
        method: 'signalwire.event',
        params: {
          event_type: 'member.talking',
          event_channel: [
            'signalwire_cf91bf05-aaa1-4dcc-ad5c-04715fa70276_582e7ba1-a075-4893-8cef-b505cac633c6_9ba74bce-5b02-475c-b183-2b5a7f6cfa8b',
          ],
          timestamp: 1718299953114539,
          params: {
            room_id: 'b121ef92-2e47-400d-b742-2e2bd4356064',
            room_session_id: callId,
            member: {
              member_id: 'member-id-1',
              talking: true,
              node_id: '2c71e542-d639-4043-8fd9-6b8bb3c5e0ed@',
            },
          },
        },
      }
      const talkingFalse = {
        jsonrpc: '2.0',
        id: '2f260116-9447-4a16-a806-231137c2a111',
        method: 'signalwire.event',
        params: {
          event_type: 'member.talking',
          event_channel: [
            'signalwire_cf91bf05-aaa1-4dcc-ad5c-04715fa70276_582e7ba1-a075-4893-8cef-b505cac633c6_9ba74bce-5b02-475c-b183-2b5a7f6cfa8b',
          ],
          timestamp: 1718299953114539,
          params: {
            room_id: 'b121ef92-2e47-400d-b742-2e2bd4356064',
            room_session_id: callId,
            member: {
              member_id: 'member-id-1',
              talking: false,
              node_id: '2c71e542-d639-4043-8fd9-6b8bb3c5e0ed@',
            },
          },
        },
      }

      stack.session.dispatch(
        actions.socketMessageAction(talkingFalse as JSONRPCRequest)
      )
      stack.session.dispatch(
        actions.socketMessageAction(talkingTrue as JSONRPCRequest)
      )

      expect(talking).toBeDefined()
      expect(talkingStatus).toBeDefined()
      expect(talking).toBeTruthy()
      expect(talkingStatus).toEqual('started')
    })
  })
})
