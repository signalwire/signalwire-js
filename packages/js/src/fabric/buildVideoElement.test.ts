import { LOCAL_EVENT_PREFIX } from '@signalwire/core'
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

  beforeEach(() => {
    stack = configureFullStack()
    store = stack.store
    room = createCallFabricRoomSessionObject({
      store,
      // @ts-expect-error
      emitter: stack.emitter,
    })

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

  describe('without the peer', () => {
    it('should handle errors when the room does not have an RTC peer', async () => {
      await expect(buildVideoElement({ room })).rejects.toThrow(
        'No RTC Peer exist on the room!'
      )
    })
  })

  describe('with the peer', () => {
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
      setupRoomForTests()
    })

    afterEach(() => {
      jest.clearAllMocks()
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
        'room.subscribed',
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
  })
})
