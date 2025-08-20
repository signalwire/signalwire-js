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

    peer = new RTCPeer(mockCall, 'offer')
    // @ts-ignore - Partial mock for testing
    peer.instance = mockInstance
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('restartIceWithRelayOnly', () => {
    it('should skip if peer is answer', () => {
      peer = new RTCPeer(mockCall, 'answer')
      // @ts-ignore - Partial mock for testing
      peer.instance = mockInstance

      mockInstance.getConfiguration?.mockReturnValue({
        iceTransportPolicy: 'all',
      })

      peer.restartIceWithRelayOnly()

      expect(mockInstance.setConfiguration).not.toHaveBeenCalled()
      expect(mockInstance.restartIce).not.toHaveBeenCalled()
    })

    it('should skip if already in relay-only mode', () => {
      mockInstance.getConfiguration?.mockReturnValue({
        iceTransportPolicy: 'relay',
      })

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
      mockInstance.getConfiguration?.mockReturnValue({
        iceTransportPolicy: 'all',
      })

      const error = new Error('Test error')
      mockInstance.setConfiguration?.mockImplementation(() => {
        throw error
      })
      // @ts-ignore - Access private property for testing
      peer._rejectStartMethod = jest.fn()
      // @ts-ignore - Access private property for testing
      peer._pendingNegotiationPromise = {
        reject: jest.fn(),
      }

      peer.restartIceWithRelayOnly()
      // @ts-ignore - Access private property for testing
      expect(peer._rejectStartMethod).toHaveBeenCalledWith(error)
      // @ts-ignore - Access private property for testing
      expect(peer._pendingNegotiationPromise.reject).toHaveBeenCalledWith(error)
    })
  })

  describe('requestKeyframe', () => {
    let mockVideoSender: jest.Mocked<RTCRtpSender>

    beforeEach(() => {
      mockVideoSender = {
        track: {
          kind: 'video',
          readyState: 'live',
          stop: jest.fn(),
        },
        replaceTrack: jest.fn(() => Promise.resolve()),
      } as any

      mockInstance.getSenders = jest.fn(() => [mockVideoSender]) as any
      mockInstance.getStats = jest.fn(() => Promise.resolve(new Map([
        ['outbound-video-1', {
          type: 'outbound-rtp',
          kind: 'video',
          ssrc: 12345,
        }]
      ]))) as any
    })

    it('should throw error if no RTCPeerConnection instance', async () => {
      peer.instance = undefined as any

      await expect(peer.requestKeyframe()).rejects.toThrow('RTCPeerConnection instance not available')
      expect(mockLogger.error).toHaveBeenCalledWith('Cannot request keyframe: RTCPeerConnection instance not available')
    })

    it('should return early if no video sender available', async () => {
      mockInstance.getSenders?.mockReturnValue([])

      await peer.requestKeyframe()

      expect(mockLogger.warn).toHaveBeenCalledWith('No video sender available for keyframe request - no video track to refresh')
      expect(mockVideoSender.replaceTrack).not.toHaveBeenCalled()
    })

    it('should successfully request keyframe via track replacement', async () => {
      await peer.requestKeyframe()

      expect(mockLogger.info).toHaveBeenCalledWith('Requesting keyframe for video quality recovery')
      expect(mockInstance.getStats).toHaveBeenCalled()
      expect(mockVideoSender.replaceTrack).toHaveBeenCalledWith(null)
      expect(mockVideoSender.replaceTrack).toHaveBeenCalledWith(mockVideoSender.track)
      expect(mockLogger.info).toHaveBeenCalledWith('Keyframe requested successfully via track replacement')
    })

    it('should handle track not in live state', async () => {
      // Create a new sender with ended track
      const endedSender = {
        track: {
          kind: 'video',
          readyState: 'ended',
          stop: jest.fn(),
        },
        replaceTrack: jest.fn(() => Promise.resolve()),
      } as any

      ;(mockInstance.getSenders as any).mockReturnValue([endedSender])

      await expect(peer.requestKeyframe()).rejects.toThrow('Video track is not in live state')
      expect(mockLogger.warn).toHaveBeenCalledWith('Video track not in live state: ended')
    })

    it('should handle errors during keyframe request', async () => {
      const error = new Error('Replace track failed')
      mockVideoSender.replaceTrack.mockRejectedValue(error)

      await expect(peer.requestKeyframe()).rejects.toThrow('Replace track failed')
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to request keyframe:', error)
    })
  })

  describe('triggerReinvite', () => {
    beforeEach(() => {
      // Mock startNegotiation method
      ;(peer as any).startNegotiation = jest.fn(() => Promise.resolve())
      // @ts-ignore - Access private property for testing
      peer._negotiating = false
      // @ts-ignore - Access private property for testing
      peer._restartingIce = false
      // @ts-ignore - Access private property for testing
      peer._processingRemoteSDP = false
      // @ts-ignore - Access private property for testing
      peer._processingLocalSDP = false
    })

    it('should throw error if negotiation is already in progress', async () => {
      // @ts-ignore - Access private property for testing
      peer._negotiating = true

      await expect(peer.triggerReinvite()).rejects.toThrow('Negotiation already in progress')
      expect(mockLogger.warn).toHaveBeenCalledWith('Cannot trigger reinvite during active negotiation')
    })

    it('should throw error if no RTCPeerConnection instance', async () => {
      peer.instance = undefined as any

      await expect(peer.triggerReinvite()).rejects.toThrow('RTCPeerConnection instance not available')
      expect(mockLogger.error).toHaveBeenCalledWith('Cannot trigger reinvite: RTCPeerConnection instance not available')
    })

    it('should successfully trigger reinvite', async () => {
      await peer.triggerReinvite()

      expect(mockLogger.info).toHaveBeenCalledWith('Triggering full re-negotiation (reinvite)')
      expect(peer.type).toBe('offer')
      expect(peer.startNegotiation).toHaveBeenCalledWith(true)
      expect(mockLogger.info).toHaveBeenCalledWith('Reinvite (full re-negotiation) initiated successfully')
    })

    it('should reset negotiation state before starting reinvite', async () => {
      // @ts-ignore - Set initial state for testing (but keep _negotiating false to pass initial check)
      ;(peer as any)._negotiating = false // This must be false to pass the initial check
      ;(peer as any)._restartingIce = true
      ;(peer as any)._processingRemoteSDP = true
      ;(peer as any)._processingLocalSDP = true

      await peer.triggerReinvite()

      // @ts-ignore - Check state was reset
      expect((peer as any)._negotiating).toBe(false)
      expect((peer as any)._restartingIce).toBe(false)
      expect((peer as any)._processingRemoteSDP).toBe(false)
      expect((peer as any)._processingLocalSDP).toBe(false)
      expect(peer.startNegotiation).toHaveBeenCalledWith(true)
    })

    it('should handle errors during reinvite', async () => {
      const error = new Error('Negotiation failed')
      ;(peer.startNegotiation as jest.MockedFunction<any>).mockRejectedValue(error)

      await expect(peer.triggerReinvite()).rejects.toThrow('Negotiation failed')
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to trigger reinvite:', error)
    })
  })

  describe('triggerICERestart', () => {
    beforeEach(() => {
      peer.restartIce = jest.fn()
    })

    it('should successfully trigger ICE restart', async () => {
      await peer.triggerICERestart()

      expect(peer.restartIce).toHaveBeenCalled()
      expect(mockLogger.debug).toHaveBeenCalledWith('ICE restart triggered successfully')
    })

    it('should handle errors during ICE restart', async () => {
      const error = new Error('ICE restart failed')
      ;(peer.restartIce as jest.Mock).mockImplementation(() => {
        throw error
      })

      await expect(peer.triggerICERestart()).rejects.toThrow('ICE restart failed')
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to trigger ICE restart', error)
    })
  })
})
