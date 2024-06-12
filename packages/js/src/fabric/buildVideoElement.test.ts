import { LOCAL_EVENT_PREFIX, actions } from '@signalwire/core'
import { configureFullStack } from '../testUtils'
import { buildVideoElement } from './buildVideoElement'
import {
  CallFabricRoomSession,
  createCallFabricRoomSessionObject,
} from './CallFabricRoomSession'
import { JSDOM } from 'jsdom'

describe('buildVideoElement', () => {
  let room: CallFabricRoomSession
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
    room = createCallFabricRoomSessionObject({
      store,
      // @ts-expect-error
      emitter: stack.emitter,
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
      'member.updated.video_muted',
      expect.any(Function)
    )
    expect(room.off).toHaveBeenCalledWith(
      `${LOCAL_EVENT_PREFIX}.mirror.video`,
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
          room_session_id: 'b2a6677d-9e68-463d-8220-93305bf8de0b',
          layout: {
            layers: [
              {
                layer_index: 0,
                z_index: 0,
                member_id: 'b969f74c-85d1-4d5d-8011-7a00d38c7624',
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

    const renderAndStartVideo = (element?: HTMLDivElement) => {
      let mockRootEl: HTMLDivElement
      if (!element) {
        mockRootEl = document.createElement('div')
        mockRootEl.id = 'rootElement'
      } else {
        mockRootEl = element
      }
      document.body.appendChild(mockRootEl)

      const promise = buildVideoElement({ room, rootElement: mockRootEl })

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

    it('should render the mcuLayers', async () => {
      // @ts-expect-error
      stack.session.dispatch(actions.socketMessageAction(layoutEventPayload))

      const result = await renderAndStartVideo()

      expect(result).toHaveProperty('element')
      expect(result).toHaveProperty('unsubscribe')

      const mcuLayers = result.element.querySelector('.mcuLayers')
      expect(mcuLayers).not.toBeNull()
      expect(mcuLayers!.childElementCount).toBe(1)
    })

    it('should render two elements if the IDs are different', async () => {
      // @ts-expect-error
      stack.session.dispatch(actions.socketMessageAction(layoutEventPayload))

      const mockRootEl1 = document.createElement('div')
      mockRootEl1.id = 'rootElement1'

      const result1 = await renderAndStartVideo(mockRootEl1)
      expect(result1).toHaveProperty('element')
      expect(result1).toHaveProperty('unsubscribe')

      const mcuLayers1 = result1.element.querySelector('.mcuLayers')
      expect(mcuLayers1).not.toBeNull()
      expect(mcuLayers1!.childElementCount).toBe(1)

      const mockRootEl2 = document.createElement('div')
      mockRootEl2.id = 'rootElement2'

      const result2 = await renderAndStartVideo(mockRootEl2)
      expect(result2).toHaveProperty('element')
      expect(result2).toHaveProperty('unsubscribe')

      const mcuLayers2 = result2.element.querySelector('.mcuLayers')
      expect(mcuLayers2).not.toBeNull()
      expect(mcuLayers2!.childElementCount).toBe(1)
      expect(mcuLayers1!.childElementCount).toBe(1)

      expect(mcuLayers1).not.toBe(mcuLayers2)
    })

    it('should render only one element if the IDs are same', async () => {
      // @ts-expect-error
      stack.session.dispatch(actions.socketMessageAction(layoutEventPayload))

      const mockRootEl = document.createElement('div')
      mockRootEl.id = 'rootElement1'

      const result1 = await renderAndStartVideo(mockRootEl)
      expect(result1).toHaveProperty('element')
      expect(result1).toHaveProperty('unsubscribe')

      const mcuLayers1 = result1.element.querySelector('.mcuLayers')
      expect(mcuLayers1).not.toBeNull()
      expect(mcuLayers1!.childElementCount).toBe(1)

      const result2 = await renderAndStartVideo(mockRootEl)
      expect(result2).toHaveProperty('element')
      expect(result2).toHaveProperty('unsubscribe')

      const mcuLayers2 = result2.element.querySelector('.mcuLayers')
      expect(mcuLayers2).not.toBeNull()
      expect(mcuLayers2!.childElementCount).toBe(1)
      expect(mcuLayers1!.childElementCount).toBe(1)

      expect(mcuLayers1).toBe(mcuLayers2)
    })

    it('should mirror the video', async () => {
      // @ts-expect-error
      stack.session.dispatch(actions.socketMessageAction(layoutEventPayload))

      const result = await renderAndStartVideo()
      const mcuLayers = result.element.querySelector('.mcuLayers')
      const videoElement = mcuLayers!.querySelector('video')

      expect(room.localOverlay.mirrored).toBe(undefined)
      expect(videoElement!.style.transform).toBe('scale(1, 1)')

      room.localOverlay.setMirrored(true)
      expect(room.localOverlay.mirrored).toBe(true)
      expect(videoElement!.style.transform).toBe('scale(-1, 1)')

      room.localOverlay.setMirrored(false)
      expect(room.localOverlay.mirrored).toBe(false)
      expect(videoElement!.style.transform).toBe('scale(1, 1)')
    })
  })
})
