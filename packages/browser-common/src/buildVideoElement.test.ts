import { JSDOM } from 'jsdom'
import { actions } from '@signalwire/core'
import {
  configureFullStack,
  dispatchMockedCallJoined,
  dispatchMockedRoomSubscribed,
} from '@signalwire/browser-common'
import { buildVideoElement, BuildVideoElementParams } from './buildVideoElement'
import {
  FabricRoomSession,
  createFabricRoomSessionObject,
} from '../../js/src/fabric/FabricRoomSession'
import {
  createVideoRoomSessionObject,
  VideoRoomSession,
} from '../../js/src/video/VideoRoomSession'
import { addOverlayPrefix, SDK_PREFIX } from '../../js/src/utils/roomSession'

describe('buildVideoElement', () => {
  describe('with FabricRoomSession', () => {
    let room: FabricRoomSession
    let stack: ReturnType<typeof configureFullStack>
    let store: any
    let jsdom: JSDOM
    const callId = 'call-id-1'
    const mockPeer = {
      uuid: callId,
      onRemoteSdp: jest.fn(),
    }

    const setupRoomForTests = () => {
      // @ts-expect-error
      room.getRTCPeerById = jest.fn((_id: string) => mockPeer)
      // @ts-expect-error
      room.runRTCPeerWorkers(callId)
    }

    beforeEach(() => {
      stack = configureFullStack()
      store = stack.store
      room = createFabricRoomSessionObject({
        store,
      })
      setupRoomForTests()

      jsdom = new JSDOM('<!doctype html><html><body></body></html>')
      global.document = jsdom.window.document
      global.HTMLDivElement = jsdom.window.HTMLDivElement
    })

    afterEach(() => {
      jest.clearAllMocks()
      // @ts-expect-error
      delete global.document
      // @ts-expect-error
      delete global.HTMLDivElement
    })

    it('should take a video element and return it with unsubscribe function', async () => {
      const mockRootEl = document.createElement('div')
      const result = await buildVideoElement({ room, rootElement: mockRootEl })

      expect(result).toHaveProperty('element')
      expect(result).toHaveProperty('unsubscribe')
      expect(result.element).toBeInstanceOf(HTMLDivElement)
      expect(result.unsubscribe).toBeInstanceOf(Function)
    })

    it('should create a video element and return it with unsubscribe function', async () => {
      const result = await buildVideoElement({ room })

      expect(result).toHaveProperty('element')
      expect(result).toHaveProperty('unsubscribe')
      expect(result.element).toBeInstanceOf(HTMLDivElement)
      expect(result.unsubscribe).toBeInstanceOf(Function)
    })

    it('should unsubscribe from all events on unsubscribe', async () => {
      const mockVideoEl = document.createElement('div')
      const result = await buildVideoElement({ room, rootElement: mockVideoEl })

      // Mock the room.off function to spy on it
      room.off = jest.fn()

      result.unsubscribe()

      expect(room.off).toHaveBeenCalledWith('track', expect.any(Function))
      expect(room.off).toHaveBeenCalledWith(
        'layout.changed',
        expect.any(Function)
      )
      expect(room.off).toHaveBeenCalledWith(
        'member.updated.videoMuted',
        expect.any(Function)
      )
      expect(room.off).toHaveBeenCalledWith('destroy', expect.any(Function))
    })

    describe('with remoteVideoTrack', () => {
      const layoutEventPayload = {
        jsonrpc: '2.0',
        id: '79996d32-aefd-4e37-b1c1-382144334122',
        method: 'signalwire.event',
        params: {
          event_type: 'layout.changed',
          event_channel: [
            'signalwire_12fee1d5-b000-408f-8e3a-7cb3bbe9755e_1ad23ed0-18e0-4167-a953-a59f2976c02c_f15c5e3a-e5d6-4607-9a3d-c5af0aa9236a',
          ],
          timestamp: 1716832047176777,
          params: {
            room_id: '8facb303-63da-41c5-9f6b-4c97255cdec2',
            room_session_id: callId,
            layout: {
              layers: [
                {
                  layer_index: 0,
                  z_index: 0,
                  member_id: 'member-id-1',
                  playing_file: false,
                  position: 'standard-1',
                  visible: true,
                  x: 0,
                  y: 0,
                  width: 100,
                  height: 100,
                },
                {
                  layer_index: 1,
                  z_index: 1,
                  playing_file: false,
                  position: 'playback',
                  visible: true,
                  x: 0,
                  y: 0,
                  width: 100,
                  height: 100,
                },
                {
                  layer_index: 2,
                  z_index: 2,
                  playing_file: false,
                  position: 'full-screen',
                  visible: true,
                  x: 0,
                  y: 0,
                  width: 100,
                  height: 100,
                },
              ],
              id: 'grid-responsive',
              name: 'Grid',
            },
          },
        },
      }

      const renderAndStartVideo = (
        params?: Omit<BuildVideoElementParams, 'room'>
      ) => {
        const { rootElement: element } = params || {}
        let mockRootEl: HTMLElement
        if (!element) {
          mockRootEl = document.createElement('div')
          mockRootEl.id = 'rootElement'
        } else {
          mockRootEl = element
        }
        document.body.appendChild(mockRootEl)

        const promise = buildVideoElement({
          room,
          rootElement: mockRootEl,
          ...params,
        })

        const videoElement = mockRootEl.querySelector('video')
        expect(videoElement).not.toBeNull()

        // Create and dispatch the 'canplay' event using a more specific Event
        const canplayEvent = document.createEvent('HTMLEvents')
        canplayEvent.initEvent('canplay', true, true)
        videoElement!.dispatchEvent(canplayEvent)

        return promise
      }

      beforeEach(() => {
        const newPeerMock = {
          ...mockPeer,
          hasVideoSender: true,
          // @ts-expect-error
          remoteVideoTrack: new MediaStreamTrack('video'),
        }
        // @ts-expect-error
        room.getRTCPeerById = jest.fn((_id: string) => newPeerMock)
        // @ts-expect-error
        room.localStream = new MediaStream([])
      })

      it('should make video element that contains a remote video track', async () => {
        const result = await renderAndStartVideo()

        expect(result).toHaveProperty('element')
        expect(result).toHaveProperty('unsubscribe')

        const videoElement = result.element.querySelector('video')
        // Check if srcObject contains the remote video track
        expect(videoElement!.srcObject).toBeInstanceOf(MediaStream)
        const mediaStream = videoElement!.srcObject as MediaStream
        // @ts-expect-error
        expect(mediaStream.getTracks()).toContain(room.peer.remoteVideoTrack)

        const mcuLayers = result.element.querySelector('.mcuLayers')
        expect(mcuLayers).not.toBeNull()
        expect(mcuLayers!.childElementCount).toBe(0)
      })

      it('should render the mcuLayers with video and member overlay', async () => {
        // mock a call.joined event
        dispatchMockedCallJoined({
          session: stack.session,
          callId: callId,
          roomId: 'room-id-1',
          roomSessionId: callId,
          memberId: 'member-id-1',
          nodeId: 'node-id-1',
          originCallId: callId,
          capabilities: [],
        })

        // @ts-expect-error
        stack.session.dispatch(actions.socketMessageAction(layoutEventPayload))

        const result = await renderAndStartVideo()

        expect(result).toHaveProperty('element')
        expect(result).toHaveProperty('unsubscribe')

        const mcuLayers = result.element.querySelector('.mcuLayers')
        expect(mcuLayers).not.toBeNull()
        expect(mcuLayers!.childElementCount).toBe(2)

        const children = Array.from(mcuLayers!.children)

        // Check if the video overlay is present
        const videoOverlay = children.find((child) =>
          child.id.startsWith(SDK_PREFIX)
        )
        expect(videoOverlay).toBeDefined()
        expect(videoOverlay?.id.startsWith(SDK_PREFIX)).toBe(true)

        // Check if the member overlay is present
        const memberOverlay = children.find((child) =>
          child.id.startsWith(addOverlayPrefix('member-id-1'))
        )
        expect(memberOverlay).toBeDefined()
        expect(
          memberOverlay?.id.startsWith(addOverlayPrefix('member-id-1'))
        ).toBe(true)
      })

      it('should not render the video overlay if applyLocalVideoOverlay is false', async () => {
        // mock a call.joined event
        dispatchMockedCallJoined({
          session: stack.session,
          callId: callId,
          roomId: 'room-id-1',
          roomSessionId: callId,
          memberId: 'member-id-1',
          nodeId: 'node-id-1',
          originCallId: callId,
          capabilities: [],
        })

        // @ts-expect-error
        stack.session.dispatch(actions.socketMessageAction(layoutEventPayload))

        const result = await renderAndStartVideo({
          applyLocalVideoOverlay: false,
        })

        expect(result).toHaveProperty('element')
        expect(result).toHaveProperty('unsubscribe')

        const mcuLayers = result.element.querySelector('.mcuLayers')
        expect(mcuLayers).not.toBeNull()
        expect(mcuLayers!.childElementCount).toBe(1)

        const children = Array.from(mcuLayers!.children)

        // Check if the video overlay is present
        const videoOverlay = children.find((child) =>
          child.id.startsWith(SDK_PREFIX)
        )
        expect(videoOverlay).not.toBeDefined()

        // Check if the member overlay is present
        const memberOverlay = children.find((child) =>
          child.id.startsWith(addOverlayPrefix('member-id-1'))
        )
        expect(memberOverlay).toBeDefined()
        expect(
          memberOverlay?.id.startsWith(addOverlayPrefix('member-id-1'))
        ).toBe(true)
      })

      it('should not render the member overlay if applyMemberOverlay is false', async () => {
        // mock a call.joined event
        dispatchMockedCallJoined({
          session: stack.session,
          callId: callId,
          roomId: 'room-id-1',
          roomSessionId: callId,
          memberId: 'member-id-1',
          nodeId: 'node-id-1',
          originCallId: callId,
          capabilities: [],
        })

        // @ts-expect-error
        stack.session.dispatch(actions.socketMessageAction(layoutEventPayload))

        const result = await renderAndStartVideo({ applyMemberOverlay: false })

        expect(result).toHaveProperty('element')
        expect(result).toHaveProperty('unsubscribe')

        const mcuLayers = result.element.querySelector('.mcuLayers')
        expect(mcuLayers).not.toBeNull()
        expect(mcuLayers!.childElementCount).toBe(1)

        const children = Array.from(mcuLayers!.children)

        // Check if the video overlay is present
        const videoOverlay = children.find((child) =>
          child.id.startsWith(SDK_PREFIX)
        )
        expect(videoOverlay).toBeDefined()
        expect(videoOverlay?.id.startsWith(SDK_PREFIX)).toBe(true)

        // Check if the member overlay is present
        const memberOverlay = children.find((child) =>
          child.id.startsWith(addOverlayPrefix('member-id-1'))
        )
        expect(memberOverlay).not.toBeDefined()
      })

      it('should render two elements if the IDs are different', async () => {
        // mock a call.joined event
        dispatchMockedCallJoined({
          session: stack.session,
          callId: callId,
          roomId: 'room-id-1',
          roomSessionId: callId,
          memberId: 'member-id-1',
          nodeId: 'node-id-1',
          originCallId: callId,
          capabilities: [],
        })

        // @ts-expect-error
        stack.session.dispatch(actions.socketMessageAction(layoutEventPayload))

        const mockRootEl1 = document.createElement('div')
        mockRootEl1.id = 'rootElement1'

        const result1 = await renderAndStartVideo({ rootElement: mockRootEl1 })
        expect(result1).toHaveProperty('element')
        expect(result1).toHaveProperty('unsubscribe')

        const mcuLayers1 = result1.element.querySelector('.mcuLayers')
        expect(mcuLayers1).not.toBeNull()
        expect(mcuLayers1!.childElementCount).toBe(2)

        const mockRootEl2 = document.createElement('div')
        mockRootEl2.id = 'rootElement2'

        const result2 = await renderAndStartVideo({ rootElement: mockRootEl2 })
        expect(result2).toHaveProperty('element')
        expect(result2).toHaveProperty('unsubscribe')

        const mcuLayers2 = result2.element.querySelector('.mcuLayers')
        expect(mcuLayers2).not.toBeNull()
        expect(mcuLayers2!.childElementCount).toBe(2)

        expect(mcuLayers1).not.toBe(mcuLayers2)
      })

      it('should render only one element if the IDs are same', async () => {
        // mock a call.joined event
        dispatchMockedCallJoined({
          session: stack.session,
          callId: callId,
          roomId: 'room-id-1',
          roomSessionId: callId,
          memberId: 'member-id-1',
          nodeId: 'node-id-1',
          originCallId: callId,
          capabilities: [],
        })
        // @ts-expect-error
        stack.session.dispatch(actions.socketMessageAction(layoutEventPayload))

        const mockRootEl = document.createElement('div')
        mockRootEl.id = 'rootElement1'

        const result1 = await renderAndStartVideo({ rootElement: mockRootEl })
        expect(result1).toHaveProperty('element')
        expect(result1).toHaveProperty('unsubscribe')

        const mcuLayers1 = result1.element.querySelector('.mcuLayers')
        expect(mcuLayers1).not.toBeNull()
        expect(mcuLayers1!.childElementCount).toBe(2)

        const result2 = await renderAndStartVideo({ rootElement: mockRootEl })
        expect(result2).toHaveProperty('element')
        expect(result2).toHaveProperty('unsubscribe')

        const mcuLayers2 = result2.element.querySelector('.mcuLayers')
        expect(mcuLayers2).not.toBeNull()
        expect(mcuLayers2!.childElementCount).toBe(2)

        expect(mcuLayers1).toBe(mcuLayers2)
      })

      it('should mirror the video overlay', async () => {
        // mock a call.joined event
        dispatchMockedCallJoined({
          session: stack.session,
          callId: callId,
          roomId: 'room-id-1',
          roomSessionId: callId,
          memberId: 'member-id-1',
          nodeId: 'node-id-1',
          originCallId: callId,
          capabilities: [],
        })
        // @ts-expect-error
        stack.session.dispatch(actions.socketMessageAction(layoutEventPayload))

        const result = await renderAndStartVideo()
        const mcuLayers = result.element.querySelector('.mcuLayers')
        const videoElement = mcuLayers!.querySelector('video')

        expect(room.localVideoOverlay!.mirrored).toBe(true)
        expect(videoElement!.style.transform).toBe('scale(-1, 1)')

        room.localVideoOverlay!.setMirror(false)
        expect(room.localVideoOverlay!.mirrored).toBe(false)
        expect(videoElement!.style.transform).toBe('scale(1, 1)')

        room.localVideoOverlay!.setMirror(true)
        expect(room.localVideoOverlay!.mirrored).toBe(true)
        expect(videoElement!.style.transform).toBe('scale(-1, 1)')
      })

      it('should hide the video overlay', async () => {
        // mock a call.joined event
        dispatchMockedCallJoined({
          session: stack.session,
          callId: callId,
          roomId: 'room-id-1',
          roomSessionId: callId,
          memberId: 'member-id-1',
          nodeId: 'node-id-1',
          originCallId: callId,
          capabilities: [],
        })
        // @ts-expect-error
        stack.session.dispatch(actions.socketMessageAction(layoutEventPayload))

        await renderAndStartVideo()

        expect(room.localVideoOverlay!.status).toBe('hidden')

        room.localVideoOverlay!.show()
        expect(room.localVideoOverlay!.status).toBe('visible')

        room.localVideoOverlay!.hide()
        expect(room.localVideoOverlay!.status).toBe('hidden')
      })
    })
  })

  describe('with VideoRoomSession', () => {
    let room: VideoRoomSession
    let stack: ReturnType<typeof configureFullStack>
    let store: any
    let jsdom: JSDOM
    const callId = 'call-id-1'
    const mockPeer = {
      uuid: callId,
      onRemoteSdp: jest.fn(),
    }

    const setupRoomForTests = () => {
      // @ts-expect-error
      room.getRTCPeerById = jest.fn((_id: string) => mockPeer)

      // @ts-expect-error
      room.runRTCPeerWorkers(callId)
    }

    beforeEach(() => {
      stack = configureFullStack()
      store = stack.store
      room = createVideoRoomSessionObject({
        store,
      })
      setupRoomForTests()

      jsdom = new JSDOM('<!doctype html><html><body></body></html>')
      global.document = jsdom.window.document
      global.HTMLDivElement = jsdom.window.HTMLDivElement
    })

    afterEach(() => {
      jest.clearAllMocks()
      // @ts-expect-error
      delete global.document
      // @ts-expect-error
      delete global.HTMLDivElement
    })

    it('should take a video element and return it with unsubscribe function', async () => {
      const mockRootEl = document.createElement('div')
      const result = await buildVideoElement({ room, rootElement: mockRootEl })

      expect(result).toHaveProperty('element')
      expect(result).toHaveProperty('unsubscribe')
      expect(result.element).toBeInstanceOf(HTMLDivElement)
      expect(result.unsubscribe).toBeInstanceOf(Function)
    })

    it('should create a video element and return it with unsubscribe function', async () => {
      const result = await buildVideoElement({ room })

      expect(result).toHaveProperty('element')
      expect(result).toHaveProperty('unsubscribe')
      expect(result.element).toBeInstanceOf(HTMLDivElement)
      expect(result.unsubscribe).toBeInstanceOf(Function)
    })

    it('should unsubscribe from all events on unsubscribe', async () => {
      const mockVideoEl = document.createElement('div')
      const result = await buildVideoElement({ room, rootElement: mockVideoEl })

      // Mock the room.off function to spy on it
      room.off = jest.fn()

      result.unsubscribe()

      expect(room.off).toHaveBeenCalledWith('track', expect.any(Function))
      expect(room.off).toHaveBeenCalledWith(
        'layout.changed',
        expect.any(Function)
      )
      expect(room.off).toHaveBeenCalledWith(
        'member.updated.videoMuted',
        expect.any(Function)
      )
      expect(room.off).toHaveBeenCalledWith('destroy', expect.any(Function))
    })

    describe('with remoteVideoTrack', () => {
      const layoutEventPayload = {
        jsonrpc: '2.0',
        id: '79996d32-aefd-4e37-b1c1-382144334122',
        method: 'signalwire.event',
        params: {
          event_type: 'video.layout.changed',
          event_channel: 'd97016d7-6eaa-441e-a1c5-e817672a9dcd',
          timestamp: 1716832047176777,
          params: {
            room_id: '8facb303-63da-41c5-9f6b-4c97255cdec2',
            room_session_id: callId,
            layout: {
              layers: [
                {
                  layer_index: 0,
                  x: 0,
                  y: 0,
                  z_index: 0,
                  height: 100,
                  width: 100,
                  member_id: 'member-id-1',
                  reservation: 'standard-1',
                  position: 'standard-1',
                  playing_file: false,
                  visible: true,
                },
                {
                  layer_index: 1,
                  x: 0,
                  y: 0,
                  z_index: 1,
                  height: 100,
                  width: 100,
                  member_id: null,
                  reservation: 'playback',
                  position: 'playback',
                  playing_file: false,
                  visible: true,
                },
                {
                  layer_index: 2,
                  x: 0,
                  y: 0,
                  z_index: 2,
                  height: 100,
                  width: 100,
                  member_id: null,
                  reservation: 'full-screen',
                  position: 'full-screen',
                  playing_file: false,
                  visible: true,
                },
              ],
              name: 'grid-responsive',
              room_id: '8facb303-63da-41c5-9f6b-4c97255cdec2',
              room_session_id: callId,
            },
          },
        },
      }

      const renderAndStartVideo = (
        params?: Omit<BuildVideoElementParams, 'room'>
      ) => {
        const { rootElement: element } = params || {}
        let mockRootEl: HTMLElement
        if (!element) {
          mockRootEl = document.createElement('div')
          mockRootEl.id = 'rootElement'
        } else {
          mockRootEl = element
        }
        document.body.appendChild(mockRootEl)

        const promise = buildVideoElement({
          room,
          rootElement: mockRootEl,
          ...params,
        })

        const videoElement = mockRootEl.querySelector('video')
        expect(videoElement).not.toBeNull()

        // Create and dispatch the 'canplay' event using a more specific Event
        const canplayEvent = document.createEvent('HTMLEvents')
        canplayEvent.initEvent('canplay', true, true)
        videoElement!.dispatchEvent(canplayEvent)

        return promise
      }

      beforeEach(() => {
        const newPeerMock = {
          ...mockPeer,
          hasVideoSender: true,
          // @ts-expect-error
          remoteVideoTrack: new MediaStreamTrack('video'),
        }
        // @ts-expect-error
        room.getRTCPeerById = jest.fn((_id: string) => newPeerMock)
        // @ts-expect-error
        room.localStream = new MediaStream([])
      })

      it('should make video element that contains a remote video track', async () => {
        const result = await renderAndStartVideo()

        expect(result).toHaveProperty('element')
        expect(result).toHaveProperty('unsubscribe')

        const videoElement = result.element.querySelector('video')
        // Check if srcObject contains the remote video track
        expect(videoElement!.srcObject).toBeInstanceOf(MediaStream)
        const mediaStream = videoElement!.srcObject as MediaStream
        // @ts-expect-error
        expect(mediaStream.getTracks()).toContain(room.peer.remoteVideoTrack)

        const mcuLayers = result.element.querySelector('.mcuLayers')
        expect(mcuLayers).not.toBeNull()
        expect(mcuLayers!.childElementCount).toBe(0)
      })

      it('should render the mcuLayers with video and member overlay', async () => {
        // mock a room.subscribed event
        dispatchMockedRoomSubscribed({
          session: stack.session,
          callId: callId,
          roomId: 'room-id-1',
          roomSessionId: callId,
          memberId: 'member-id-1',
        })

        // @ts-expect-error
        stack.session.dispatch(actions.socketMessageAction(layoutEventPayload))

        const result = await renderAndStartVideo()

        expect(result).toHaveProperty('element')
        expect(result).toHaveProperty('unsubscribe')

        const mcuLayers = result.element.querySelector('.mcuLayers')
        expect(mcuLayers).not.toBeNull()
        expect(mcuLayers!.childElementCount).toBe(2)

        const children = Array.from(mcuLayers!.children)

        // Check if the video overlay is present
        const videoOverlay = children.find((child) =>
          child.id.startsWith(SDK_PREFIX)
        )
        expect(videoOverlay).toBeDefined()
        expect(videoOverlay?.id.startsWith(SDK_PREFIX)).toBe(true)

        // Check if the member overlay is present
        const memberOverlay = children.find((child) =>
          child.id.startsWith(addOverlayPrefix('member-id-1'))
        )
        expect(memberOverlay).toBeDefined()
        expect(
          memberOverlay?.id.startsWith(addOverlayPrefix('member-id-1'))
        ).toBe(true)
      })

      it('should not render the video overlay if applyLocalVideoOverlay is false', async () => {
        // mock a room.subscribed event
        dispatchMockedRoomSubscribed({
          session: stack.session,
          callId: callId,
          roomId: 'room-id-1',
          roomSessionId: callId,
          memberId: 'member-id-1',
        })

        // @ts-expect-error
        stack.session.dispatch(actions.socketMessageAction(layoutEventPayload))

        const result = await renderAndStartVideo({
          applyLocalVideoOverlay: false,
        })

        expect(result).toHaveProperty('element')
        expect(result).toHaveProperty('unsubscribe')

        const mcuLayers = result.element.querySelector('.mcuLayers')
        expect(mcuLayers).not.toBeNull()
        expect(mcuLayers!.childElementCount).toBe(1)

        const children = Array.from(mcuLayers!.children)

        // Check if the video overlay is present
        const videoOverlay = children.find((child) =>
          child.id.startsWith(SDK_PREFIX)
        )
        expect(videoOverlay).not.toBeDefined()

        // Check if the member overlay is present
        const memberOverlay = children.find((child) =>
          child.id.startsWith(addOverlayPrefix('member-id-1'))
        )
        expect(memberOverlay).toBeDefined()
        expect(
          memberOverlay?.id.startsWith(addOverlayPrefix('member-id-1'))
        ).toBe(true)
      })

      it('should not render the member overlay if applyMemberOverlay is false', async () => {
        // mock a room.subscribed event
        dispatchMockedRoomSubscribed({
          session: stack.session,
          callId: callId,
          roomId: 'room-id-1',
          roomSessionId: callId,
          memberId: 'member-id-1',
        })

        // @ts-expect-error
        stack.session.dispatch(actions.socketMessageAction(layoutEventPayload))

        const result = await renderAndStartVideo({ applyMemberOverlay: false })

        expect(result).toHaveProperty('element')
        expect(result).toHaveProperty('unsubscribe')

        const mcuLayers = result.element.querySelector('.mcuLayers')
        expect(mcuLayers).not.toBeNull()
        expect(mcuLayers!.childElementCount).toBe(1)

        const children = Array.from(mcuLayers!.children)

        // Check if the video overlay is present
        const videoOverlay = children.find((child) =>
          child.id.startsWith(SDK_PREFIX)
        )
        expect(videoOverlay).toBeDefined()
        expect(videoOverlay?.id.startsWith(SDK_PREFIX)).toBe(true)

        // Check if the member overlay is present
        const memberOverlay = children.find((child) =>
          child.id.startsWith(addOverlayPrefix('member-id-1'))
        )
        expect(memberOverlay).not.toBeDefined()
      })

      it('should render two elements if the IDs are different', async () => {
        // mock a room.subscribed event
        dispatchMockedRoomSubscribed({
          session: stack.session,
          callId: callId,
          roomId: 'room-id-1',
          roomSessionId: callId,
          memberId: 'member-id-1',
        })

        // @ts-expect-error
        stack.session.dispatch(actions.socketMessageAction(layoutEventPayload))

        const mockRootEl1 = document.createElement('div')
        mockRootEl1.id = 'rootElement1'

        const result1 = await renderAndStartVideo({ rootElement: mockRootEl1 })
        expect(result1).toHaveProperty('element')
        expect(result1).toHaveProperty('unsubscribe')

        const mcuLayers1 = result1.element.querySelector('.mcuLayers')
        expect(mcuLayers1).not.toBeNull()
        expect(mcuLayers1!.childElementCount).toBe(2)

        const mockRootEl2 = document.createElement('div')
        mockRootEl2.id = 'rootElement2'

        const result2 = await renderAndStartVideo({ rootElement: mockRootEl2 })
        expect(result2).toHaveProperty('element')
        expect(result2).toHaveProperty('unsubscribe')

        const mcuLayers2 = result2.element.querySelector('.mcuLayers')
        expect(mcuLayers2).not.toBeNull()
        expect(mcuLayers2!.childElementCount).toBe(2)

        expect(mcuLayers1).not.toBe(mcuLayers2)
      })

      it('should render only one element if the IDs are same', async () => {
        // mock a room.subscribed event
        dispatchMockedRoomSubscribed({
          session: stack.session,
          callId: callId,
          roomId: 'room-id-1',
          roomSessionId: callId,
          memberId: 'member-id-1',
        })
        // @ts-expect-error
        stack.session.dispatch(actions.socketMessageAction(layoutEventPayload))

        const mockRootEl = document.createElement('div')
        mockRootEl.id = 'rootElement1'

        const result1 = await renderAndStartVideo({ rootElement: mockRootEl })
        expect(result1).toHaveProperty('element')
        expect(result1).toHaveProperty('unsubscribe')

        const mcuLayers1 = result1.element.querySelector('.mcuLayers')
        expect(mcuLayers1).not.toBeNull()
        expect(mcuLayers1!.childElementCount).toBe(2)

        const result2 = await renderAndStartVideo({ rootElement: mockRootEl })
        expect(result2).toHaveProperty('element')
        expect(result2).toHaveProperty('unsubscribe')

        const mcuLayers2 = result2.element.querySelector('.mcuLayers')
        expect(mcuLayers2).not.toBeNull()
        expect(mcuLayers2!.childElementCount).toBe(2)

        expect(mcuLayers1).toBe(mcuLayers2)
      })

      it('should mirror the video overlay', async () => {
        // mock a room.subscribed event
        dispatchMockedRoomSubscribed({
          session: stack.session,
          callId: callId,
          roomId: 'room-id-1',
          roomSessionId: callId,
          memberId: 'member-id-1',
        })
        // @ts-expect-error
        stack.session.dispatch(actions.socketMessageAction(layoutEventPayload))

        const result = await renderAndStartVideo()
        const mcuLayers = result.element.querySelector('.mcuLayers')
        const videoElement = mcuLayers!.querySelector('video')

        expect(room.localVideoOverlay!.mirrored).toBe(true)
        expect(videoElement!.style.transform).toBe('scale(-1, 1)')

        room.localVideoOverlay!.setMirror(false)
        expect(room.localVideoOverlay!.mirrored).toBe(false)
        expect(videoElement!.style.transform).toBe('scale(1, 1)')

        room.localVideoOverlay!.setMirror(true)
        expect(room.localVideoOverlay!.mirrored).toBe(true)
        expect(videoElement!.style.transform).toBe('scale(-1, 1)')
      })

      it('should hide the video overlay', async () => {
        // mock a room.subscribed event
        dispatchMockedRoomSubscribed({
          session: stack.session,
          callId: callId,
          roomId: 'room-id-1',
          roomSessionId: callId,
          memberId: 'member-id-1',
        })
        // @ts-expect-error
        stack.session.dispatch(actions.socketMessageAction(layoutEventPayload))

        await renderAndStartVideo()

        expect(room.localVideoOverlay!.status).toBe('hidden')

        room.localVideoOverlay!.show()
        expect(room.localVideoOverlay!.status).toBe('visible')

        room.localVideoOverlay!.hide()
        expect(room.localVideoOverlay!.status).toBe('hidden')
      })
    })
  })
})
