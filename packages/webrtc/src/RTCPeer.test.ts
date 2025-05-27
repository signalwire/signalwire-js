import { jest } from '@jest/globals'
import RTCPeer from './RTCPeer'
import { getLogger } from '@signalwire/core'

jest.mock('@signalwire/core', () => {
  jest.requireActual('@signalwire/core')
  return {
    getLogger: jest.fn().mockReturnValue({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }),
    uuid: jest.fn().mockReturnValue('test-uuid'),
  }
})

describe('RTCPeer', () => {
  let peer: RTCPeer<any>
  let mockInstance: Partial<jest.Mocked<RTCPeerConnection>>
  let mockCall: jest.Mocked<any>
  let mockLogger: any

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }
    ;(getLogger as jest.Mock).mockReturnValue(mockLogger)

    mockInstance = {
      connectionState: 'new',
      iceGatheringState: 'new',
      signalingState: 'stable',
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      setConfiguration: jest.fn(),
      getConfiguration: jest.fn(),
      restartIce: jest.fn(),
    }

    mockCall = {
      emit: jest.fn(),
      id: 'test-call-id',
      options: {
        prevCallId: undefined,
        maxConnectionStateTimeout: 5000,
      },
      iceServers: [
        {
          urls: 'stun:stun.example.com',
        },
      ],
      _closeWSConnection: jest.fn(),
      setState: jest.fn(),
    } as any

    // @ts-ignore - Partial mock implementation
    global.RTCPeerConnection = jest.fn().mockImplementation(() => mockInstance)

    peer = new RTCPeer(mockCall, 'offer')
    // @ts-ignore - Access private property for testing
    peer.instance = mockInstance as RTCPeerConnection
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('restartIceWithRelayOnly', () => {

    it('should skip if peer is answer', () => {
      peer = new RTCPeer(mockCall, 'answer')
      // @ts-ignore - Access private property for testing
      peer.instance = mockInstance as RTCPeerConnection

      peer.restartIceWithRelayOnly()

      expect(mockInstance.setConfiguration).not.toHaveBeenCalled()
      expect(mockInstance.restartIce).not.toHaveBeenCalled()
    })

    it('should skip if already in relay-only mode', () => {
      mockInstance.getConfiguration?.mockReturnValue({
        iceTransportPolicy: 'relay',
      } as RTCConfiguration)

      peer.restartIceWithRelayOnly()

      expect(mockInstance.setConfiguration).not.toHaveBeenCalled()
      expect(mockInstance.restartIce).not.toHaveBeenCalled()
    })

    it('should update configuration and restart ICE', () => {
      const mockConfig = { iceServers: [] } as RTCConfiguration
      mockInstance.getConfiguration?.mockReturnValue(mockConfig)

      peer.restartIceWithRelayOnly()

      expect(mockInstance.setConfiguration).toHaveBeenCalledWith({
        ...mockConfig,
        iceTransportPolicy: 'relay',
      })
      expect(mockInstance.restartIce).toHaveBeenCalled()
    })

    it('should handle errors appropriately', () => {
      const error = new Error('Test error')
      mockInstance.getConfiguration?.mockImplementation(() => {
        throw error
      })
      // @ts-ignore - Access private property for testing
      peer._rejectStartMethod = jest.fn()
      // @ts-ignore - Access private property for testing
      peer._pendingNegotiationPromise = {
        reject: jest.fn(),
      }

      peer.restartIceWithRelayOnly()

      expect(mockLogger.error).toHaveBeenCalledWith(
        'restartIceWithRelayOnly',
        error
      )
      // @ts-ignore - Access private property for testing
      expect(peer._rejectStartMethod).toHaveBeenCalledWith(error)
      // @ts-ignore - Access private property for testing
      expect(peer._pendingNegotiationPromise.reject).toHaveBeenCalledWith(error)
    })
  })
})
