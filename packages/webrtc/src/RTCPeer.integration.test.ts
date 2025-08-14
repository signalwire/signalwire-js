import { test, expect, Page, Browser } from '@playwright/test'
import { RealTurnServer } from '../turnServer'
import path from 'path'

/**
 * RTCPeer Integration Tests
 * 
 * These tests verify the RTCPeerCore implementation using the REAL RTCPeerCore class
 * loaded from the integration bundle. They test actual ICE candidate gathering, 
 * media negotiation, and peer-to-peer connection establishment using a local TURN server.
 * 
 * The tests use the real RTCPeerCore implementation from packages/webrtc/dist/integration/rtc-peer-bundle.js
 * which includes all necessary dependencies bundled together with minimal mocks for @signalwire/core.
 * 
 * This is Phase 4 of the RTCPeer decoupling proposal - testing the real implementation.
 */

interface TestPeerConnection {
  rtcPeer: any // This will be our RTCPeer-like instance
  localCandidates: RTCIceCandidate[]
  remoteCandidates: RTCIceCandidate[]
  localDescription?: RTCSessionDescriptionInit
  remoteDescription?: RTCSessionDescriptionInit
  connectionStateLog: RTCPeerConnectionState[]
  iceGatheringStateLog: RTCIceGatheringState[]
  onLocalSDPReadyCalled: number
  onLocalSDPReadyData?: any
}

interface MediaTestConfig {
  audio: boolean
  video: boolean
  description: string
}

// Test configurations for different media types
const mediaConfigurations: MediaTestConfig[] = [
  { audio: true, video: false, description: 'audio-only' },
  { audio: false, video: true, description: 'video-only' },
  { audio: true, video: true, description: 'audio+video' },
]

/**
 * Helper function to create a test peer connection using the REAL RTCPeerCore implementation
 * This creates actual RTCPeerCore instances loaded from the integration bundle
 */
/**
 * Load the real RTCPeerCore implementation from the integration bundle
 * This loads the ACTUAL RTCPeerCore implementation, not a mock
 */
async function loadRTCPeerBundle(page: Page): Promise<void> {
  // Load the real integration bundle
  const bundlePath = path.resolve(__dirname, '../dist/integration/rtc-peer-bundle.js')
  await page.addScriptTag({ path: bundlePath })
  
  // Wait for the RTCPeerIntegration global to be available
  await page.waitForFunction(() => {
    return typeof (window as any).RTCPeerIntegration === 'object' && 
           typeof (window as any).RTCPeerIntegration.createRTCPeerCore === 'function' &&
           typeof (window as any).RTCPeerIntegration.RTCPeerCore === 'function'
  }, {}, { timeout: 5000 })
  
  // Verify the setup worked
  const bundleInfo = await page.evaluate(() => {
    const integration = (window as any).RTCPeerIntegration
    return {
      integrationLoaded: typeof integration,
      createRTCPeerCoreLoaded: typeof integration?.createRTCPeerCore,
      RTCPeerCoreLoaded: typeof integration?.RTCPeerCore,
      hasConnectionPoolManager: typeof integration?.connectionPoolManager
    }
  })
  
  console.log('Real RTCPeerCore integration bundle loaded:', bundleInfo)
  
  if (bundleInfo.createRTCPeerCoreLoaded !== 'function') {
    throw new Error(`RTCPeerIntegration not loaded properly: ${JSON.stringify(bundleInfo)}`)
  }
}

async function createTestRTCPeer(
  page: Page,
  iceServers: RTCIceServer[],
  peerVar: string,
  type: 'offer' | 'answer' = 'offer'
): Promise<TestPeerConnection> {
  // Ensure RTCPeerCore integration bundle is loaded
  await loadRTCPeerBundle(page)
  
  return await page.evaluate(
    ({ iceServers, peerVar, type }) => {
      const { createRTCPeerCore, RTCPeerCore } = (window as any).RTCPeerIntegration
      
      // Create mock BaseConnection that implements the RTCPeerCallContract interface
      class MockBaseConnection {
        public options: any
        public id: string
        public iceServers: RTCIceServer[]
        public _onLocalSDPReadyCallCount: number = 0
        public _onLocalSDPReadyData: any = null
        public _onLocalSDPReadySpy: jest.SpyFunction<any, any>[] = []
        
        constructor(options: any = {}) {
          this.options = {
            iceServers,
            negotiateAudio: true,
            negotiateVideo: true,
            maxIceGatheringTimeout: 15000,
            maxConnectionStateTimeout: 10000,
            watchMediaPackets: false,
            rtcPeerConfig: {},
            ...options
          }
          this.id = Math.random().toString(36).substr(2, 9)
          this.iceServers = iceServers
        }

        async onLocalSDPReady(rtcPeer: any) {
          this._onLocalSDPReadyCallCount++
          this._onLocalSDPReadyData = {
            type: rtcPeer.instance.localDescription?.type,
            sdpLength: rtcPeer.instance.localDescription?.sdp?.length,
            candidateCount: rtcPeer._allCandidates?.length || 0,
            candidatesSnapshot: rtcPeer._candidatesSnapshot?.length || 0,
          }
          console.log('MockBaseConnection.onLocalSDPReady called with REAL RTCPeerCore', this._onLocalSDPReadyCallCount, this._onLocalSDPReadyData)
          
          // Record the spy call
          this._onLocalSDPReadySpy.push({
            args: [rtcPeer],
            timestamp: Date.now(),
            callCount: this._onLocalSDPReadyCallCount,
            data: this._onLocalSDPReadyData
          })
          
          return Promise.resolve()
        }

        emit(event: string, ...args: any[]) {
          console.log('BaseConnection event:', event, args.length > 0 ? 'with args' : '')
          return true
        }

        setState(state: string) {
          console.log('BaseConnection setState:', state)
        }

        hangup() {
          console.log('BaseConnection hangup called')
        }

        _closeWSConnection() {
          console.log('BaseConnection _closeWSConnection called')  
        }
      }

      // Create mock call (BaseConnection) with spy functionality
      const mockCall = new MockBaseConnection()
      
      // Configure mock call for this peer type
      mockCall.options.audio = true
      mockCall.options.video = true
      
      // Create REAL RTCPeerCore instance using the factory function
      const rtcPeer = createRTCPeerCore(mockCall, type)
      
      console.log('Created REAL RTCPeerCore instance:', {
        uuid: rtcPeer.uuid,
        type: rtcPeer.type,
        hasInstance: !!rtcPeer.instance
      })

      const testPeer: TestPeerConnection = {
        rtcPeer,
        localCandidates: [],
        remoteCandidates: [],
        connectionStateLog: [],
        iceGatheringStateLog: [],
        onLocalSDPReadyCalled: 0,
        onLocalSDPReadyData: null,
      }

      // Store reference for global access
      ;(globalThis as any)[peerVar] = testPeer

      return testPeer
    },
    { iceServers, peerVar, type }
  )
}

/**
 * Helper function to wait for ICE gathering completion using RTCPeerCore
 */
async function waitForIceGatheringComplete(
  page: Page,
  peerVar: string,
  timeout = 15000
): Promise<RTCIceCandidate[]> {
  // Wait for ICE gathering to complete or have candidates
  await page.waitForFunction(
    ({ peerVar }) => {
      const testPeer = (globalThis as any)[peerVar]
      if (!testPeer?.rtcPeer?.instance) return false
      return testPeer.rtcPeer.instance.iceGatheringState === 'complete' || 
             testPeer.rtcPeer._allCandidates?.length > 0
    },
    { peerVar },
    { timeout }
  )
  
  // Now get the candidates
  return await page.evaluate((peerVar) => {
    const testPeer = (globalThis as any)[peerVar]
    return testPeer.rtcPeer._allCandidates || []
  }, peerVar)
}

/**
 * Helper function to wait for onLocalSDPReady callback
 */
async function waitForOnLocalSDPReady(
  page: Page,
  peerVar: string,
  timeout = 15000
): Promise<void> {
  await page.waitForFunction(
    ({ peerVar }) => {
      const testPeer = (globalThis as any)[peerVar]
      return testPeer.rtcPeer.call._onLocalSDPReadyCallCount > 0
    },
    { peerVar },
    { timeout }
  )
}

/**
 * Helper function to establish peer connection between two RTCPeers
 */
async function establishRTCPeerConnection(
  page: Page,
  offererVar: string,
  answererVar: string,
  audio: boolean,
  video: boolean
): Promise<void> {
  // Set up media options on both peers
  await page.evaluate(
    ({ offererVar, answererVar, audio, video }) => {
      const offerer = (globalThis as any)[offererVar]
      const answerer = (globalThis as any)[answererVar]
      
      // Configure options
      offerer.rtcPeer.call.options.audio = audio
      offerer.rtcPeer.call.options.video = video
      offerer.rtcPeer.call.options.negotiateAudio = audio
      offerer.rtcPeer.call.options.negotiateVideo = video
      
      answerer.rtcPeer.call.options.audio = audio
      answerer.rtcPeer.call.options.video = video
      answerer.rtcPeer.call.options.negotiateAudio = audio
      answerer.rtcPeer.call.options.negotiateVideo = video
    },
    { offererVar, answererVar, audio, video }
  )

  // Start the offerer RTCPeer (this will trigger offer creation and onLocalSDPReady)
  await page.evaluate(
    async ({ offererVar }) => {
      const offerer = (globalThis as any)[offererVar]
      
      // Note: we don't await start() because per requirements, tests should NOT wait for start() to resolve
      // Instead we'll wait for onLocalSDPReady callback
      offerer.rtcPeer.start().catch((error: any) => {
        console.log('Offerer start rejected (expected):', error)
      })
    },
    { offererVar }
  )

  // Wait for offerer's onLocalSDPReady callback
  await waitForOnLocalSDPReady(page, offererVar)

  // Get the offer from offerer
  const offerSdp = await page.evaluate((offererVar) => {
    const offerer = (globalThis as any)[offererVar]
    return offerer.rtcPeer.instance.localDescription?.sdp
  }, offererVar)

  expect(offerSdp).toBeDefined()

  // Set remote SDP on answerer and create answer
  await page.evaluate(
    async ({ answererVar, offerSdp }) => {
      const answerer = (globalThis as any)[answererVar]
      
      // Set remote SDP
      answerer.rtcPeer.call.options.remoteSdp = offerSdp
      
      // Start answerer (this will create answer and trigger onLocalSDPReady) 
      answerer.rtcPeer.start().catch((error: any) => {
        console.log('Answerer start rejected (expected):', error)
      })
    },
    { answererVar, offerSdp }
  )

  // Wait for answerer's onLocalSDPReady callback
  await waitForOnLocalSDPReady(page, answererVar)

  // Complete the connection by setting remote description on offerer
  await page.evaluate(
    async ({ offererVar, answererVar }) => {
      const offerer = (globalThis as any)[offererVar]
      const answerer = (globalThis as any)[answererVar]

      const answerSdp = answerer.rtcPeer.instance.localDescription?.sdp
      if (answerSdp) {
        await offerer.rtcPeer.onRemoteSdp(answerSdp)
      }
    },
    { offererVar, answererVar }
  )
}

/**
 * Helper function to wait for connection state using RTCPeer
 */
async function waitForConnectionState(
  page: Page,
  peerVar: string,
  targetState: RTCPeerConnectionState,
  timeout = 10000
): Promise<boolean> {
  return await page.waitForFunction(
    ({ peerVar, targetState }) => {
      const testPeer = (globalThis as any)[peerVar]
      return testPeer.rtcPeer.instance?.connectionState === targetState
    },
    { peerVar, targetState },
    { timeout }
  )
}

test.describe('RTCPeer Integration Tests', () => {
  let turnServer: RealTurnServer
  let iceServers: RTCIceServer[]

  test.beforeAll(async () => {
    turnServer = new RealTurnServer()
    await turnServer.start()
    iceServers = turnServer.getIceServers()
  })

  test.afterAll(async () => {
    if (turnServer) {
      await turnServer.stop()
    }
  })

  test.beforeEach(async ({ page }) => {
    // Set up page context
    await page.goto('about:blank')
    
    // Enable fake media devices
    await page.evaluate(() => {
      // Ensure mediaDevices exists
      if (!navigator.mediaDevices) {
        ;(navigator as any).mediaDevices = {};
      }
      
      // Override getUserMedia to provide fake streams
      navigator.mediaDevices.getUserMedia = async (constraints: MediaStreamConstraints) => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')!
          canvas.width = 640
          canvas.height = 480
          
          // Draw a simple test pattern
          ctx.fillStyle = '#4CAF50'
          ctx.fillRect(0, 0, 640, 480)
          ctx.fillStyle = '#FFF'
          ctx.font = '48px Arial'
          ctx.textAlign = 'center'
          ctx.fillText('TEST VIDEO', 320, 240)
          
          const stream = new MediaStream()
          
          if (constraints.video) {
            // @ts-ignore
            const videoTrack = canvas.captureStream(30).getVideoTracks()[0]
            stream.addTrack(videoTrack)
          }
          
          if (constraints.audio) {
            // Create a simple sine wave audio track
            const audioContext = new AudioContext()
            const oscillator = audioContext.createOscillator()
            const gain = audioContext.createGain()
            const dest = audioContext.createMediaStreamDestination()
            
            oscillator.connect(gain)
            gain.connect(dest)
            gain.gain.value = 0.1
            oscillator.frequency.value = 440
            oscillator.start()
            
            dest.stream.getAudioTracks().forEach(track => stream.addTrack(track))
          }
          
          return stream
        };
    })
  })

  mediaConfigurations.forEach(({ audio, video, description }) => {
    test(`should successfully gather ICE candidates with RTCPeer for ${description}`, async ({
      page,
    }) => {
      // Create test RTCPeer with TURN servers
      await createTestRTCPeer(page, iceServers, 'testPeer')

      // Set up media constraints
      await page.evaluate(
        ({ audio, video }) => {
          const testPeer = (globalThis as any).testPeer
          testPeer.rtcPeer.call.options.audio = audio
          testPeer.rtcPeer.call.options.video = video
        },
        { audio, video }
      )

      // Start RTCPeer (this will trigger ICE gathering)
      await page.evaluate(async () => {
        const testPeer = (globalThis as any).testPeer
        
        // Don't await start() per requirements
        testPeer.rtcPeer.start().catch((error: any) => {
          console.log('Start method rejected as expected:', error)
        })
      })

      // Wait for onLocalSDPReady to be called
      await waitForOnLocalSDPReady(page, 'testPeer')

      // Verify onLocalSDPReady was called exactly once (early invite requirement)
      const callbackInfo = await page.evaluate(() => {
        const testPeer = (globalThis as any).testPeer
        return {
          callCount: testPeer.rtcPeer.call._onLocalSDPReadyCallCount,
          data: testPeer.rtcPeer.call._onLocalSDPReadyData,
          spyCalls: testPeer.rtcPeer.call._onLocalSDPReadySpy
        }
      })

      expect(callbackInfo.callCount).toBe(1)
      expect(callbackInfo.data.type).toBe('offer')
      expect(callbackInfo.data.candidateCount).toBeGreaterThan(0)
      expect(callbackInfo.spyCalls).toHaveLength(1)
      
      // Verify the spy recorded the correct data
      const spyCall = callbackInfo.spyCalls[0]
      expect(spyCall.callCount).toBe(1)
      expect(spyCall.data.type).toBe('offer')

      // Wait for ICE gathering to complete
      const candidates = await waitForIceGatheringComplete(page, 'testPeer', 20000)

      // Verify ICE candidates were gathered
      expect(candidates.length).toBeGreaterThan(0)

      // Check that we have different types of candidates
      const candidateInfo = await page.evaluate(() => {
        const testPeer = (globalThis as any).testPeer
        const candidates = testPeer.rtcPeer._allCandidates || []
        const hasHostCandidate = candidates.some((c: RTCIceCandidate) => c.type === 'host')
        const hasSrflxCandidate = candidates.some((c: RTCIceCandidate) => c.type === 'srflx')
        const hasRelayCandidate = candidates.some((c: RTCIceCandidate) => c.type === 'relay')
        
        return {
          totalCandidates: candidates.length,
          hasHost: hasHostCandidate,
          hasSrflx: hasSrflxCandidate,
          hasRelay: hasRelayCandidate,
          candidateTypes: candidates.map((c: RTCIceCandidate) => c.type),
        }
      })

      console.log(`${description} candidates:`, candidateInfo)

      // Verify we have host candidates (local network)
      expect(candidateInfo.hasHost).toBe(true)
      expect(candidateInfo.totalCandidates).toBeGreaterThan(0)

      // Clean up
      await page.evaluate(() => {
        const testPeer = (globalThis as any).testPeer
        testPeer.rtcPeer.stop()
      })
    })

    test(`should establish RTCPeer connection for ${description}`, async ({
      page,
    }) => {
      // Create two RTCPeers
      await createTestRTCPeer(page, iceServers, 'offerer', 'offer')
      await createTestRTCPeer(page, iceServers, 'answerer', 'answer')

      // Establish the RTCPeer connection
      await establishRTCPeerConnection(page, 'offerer', 'answerer', audio, video)

      // Wait for connection to be established
      await Promise.all([
        waitForConnectionState(page, 'offerer', 'connected', 15000),
        waitForConnectionState(page, 'answerer', 'connected', 15000),
      ])

      // Verify connection was established
      const connectionInfo = await page.evaluate(() => {
        const offerer = (globalThis as any).offerer
        const answerer = (globalThis as any).answerer
        
        return {
          offererState: offerer.rtcPeer.instance.connectionState,
          answererState: answerer.rtcPeer.instance.connectionState,
          offererIceState: offerer.rtcPeer.instance.iceConnectionState,
          answererIceState: answerer.rtcPeer.instance.iceConnectionState,
          offererCandidates: offerer.rtcPeer._allCandidates?.length || 0,
          answererCandidates: answerer.rtcPeer._allCandidates?.length || 0,
          offererOnLocalSDPReadyCalled: offerer.rtcPeer.call._onLocalSDPReadyCallCount,
          answererOnLocalSDPReadyCalled: answerer.rtcPeer.call._onLocalSDPReadyCallCount,
        }
      })

      console.log(`${description} connection info:`, connectionInfo)

      expect(connectionInfo.offererState).toBe('connected')
      expect(connectionInfo.answererState).toBe('connected')
      expect(connectionInfo.offererCandidates).toBeGreaterThan(0)
      expect(connectionInfo.answererCandidates).toBeGreaterThan(0)
      
      // Verify onLocalSDPReady was called exactly once for each peer (early invite requirement)
      expect(connectionInfo.offererOnLocalSDPReadyCalled).toBe(1)
      expect(connectionInfo.answererOnLocalSDPReadyCalled).toBe(1)

      // Verify media tracks are present through RTCPeer
      const mediaInfo = await page.evaluate(() => {
        const offerer = (globalThis as any).offerer
        const answerer = (globalThis as any).answerer
        
        const offererSenders = offerer.rtcPeer.instance.getSenders()
        const answererReceivers = answerer.rtcPeer.instance.getReceivers()
        
        return {
          offererAudioSenders: offererSenders.filter((s: RTCRtpSender) => s.track?.kind === 'audio').length,
          offererVideoSenders: offererSenders.filter((s: RTCRtpSender) => s.track?.kind === 'video').length,
          answererAudioReceivers: answererReceivers.filter((r: RTCRtpReceiver) => r.track?.kind === 'audio').length,
          answererVideoReceivers: answererReceivers.filter((r: RTCRtpReceiver) => r.track?.kind === 'video').length,
        }
      })

      expect(mediaInfo.offererAudioSenders).toBe(audio ? 1 : 0)
      expect(mediaInfo.offererVideoSenders).toBe(video ? 1 : 0)
      expect(mediaInfo.answererAudioReceivers).toBe(audio ? 1 : 0)
      expect(mediaInfo.answererVideoReceivers).toBe(video ? 1 : 0)

      // Clean up
      await page.evaluate(() => {
        const offerer = (globalThis as any).offerer
        const answerer = (globalThis as any).answerer
        offerer.rtcPeer.stop()
        answerer.rtcPeer.stop()
      })
    })

    test(`should test early invite logic for ${description}`, async ({ page }) => {
      // Create RTCPeer configured for early invite testing
      await createTestRTCPeer(page, iceServers, 'earlyInvitePeer')

      // Configure for the specific media type
      await page.evaluate(
        ({ audio, video }) => {
          const testPeer = (globalThis as any).earlyInvitePeer
          testPeer.rtcPeer.call.options.audio = audio
          testPeer.rtcPeer.call.options.video = video
          testPeer.rtcPeer.call.options.negotiateAudio = audio
          testPeer.rtcPeer.call.options.negotiateVideo = video
          
          // Track when onLocalSDPReady is called
          testPeer.onLocalSDPReadyTimestamps = []
          const originalOnLocalSDPReady = testPeer.rtcPeer.call.onLocalSDPReady.bind(testPeer.rtcPeer.call)
          testPeer.rtcPeer.call.onLocalSDPReady = function(rtcPeer: any) {
            testPeer.onLocalSDPReadyTimestamps.push(Date.now())
            return originalOnLocalSDPReady(rtcPeer)
          }
        },
        { audio, video }
      )

      // Start RTCPeer and monitor early invite behavior
      await page.evaluate(async () => {
        const testPeer = (globalThis as any).earlyInvitePeer
        
        // Track initial state
        testPeer.initialIceGatheringState = testPeer.rtcPeer.instance?.iceGatheringState
        
        // Start the RTCPeer (don't await per requirements)
        testPeer.rtcPeer.start().catch((error: any) => {
          console.log('Start method rejected as expected:', error)
        })
      })

      // Wait for the first (and hopefully only) onLocalSDPReady call
      await waitForOnLocalSDPReady(page, 'earlyInvitePeer')

      // Give some time for any potential second call
      await page.waitForTimeout(2000)

      // Verify early invite logic with real RTCPeer
      const earlyInviteInfo = await page.evaluate(() => {
        const testPeer = (globalThis as any).earlyInvitePeer
        
        return {
          onLocalSDPReadyCallCount: testPeer.rtcPeer.call._onLocalSDPReadyCallCount,
          onLocalSDPReadyTimestamps: testPeer.onLocalSDPReadyTimestamps || [],
          candidatesSnapshotLength: testPeer.rtcPeer._candidatesSnapshot?.length || 0,
          allCandidatesLength: testPeer.rtcPeer._allCandidates?.length || 0,
          iceGatheringState: testPeer.rtcPeer.instance?.iceGatheringState,
          hasValidSDP: !!testPeer.rtcPeer.instance?.localDescription?.sdp,
          spyCalls: testPeer.rtcPeer.call._onLocalSDPReadySpy || [],
          rtcPeerUuid: testPeer.rtcPeer.uuid,
          rtcPeerType: testPeer.rtcPeer.type,
        }
      })

      console.log(`${description} early invite info:`, earlyInviteInfo)

      // Verify early invite behavior: onLocalSDPReady should be called exactly once
      expect(earlyInviteInfo.onLocalSDPReadyCallCount).toBe(1)
      expect(earlyInviteInfo.onLocalSDPReadyTimestamps.length).toBe(1)
      expect(earlyInviteInfo.spyCalls).toHaveLength(1)
      
      // Verify the real RTCPeer implementation details
      expect(earlyInviteInfo.rtcPeerUuid).toBeDefined()
      expect(earlyInviteInfo.rtcPeerType).toBe('offer')
      
      // Verify SDP was generated
      expect(earlyInviteInfo.hasValidSDP).toBe(true)
      
      // Verify candidates were collected
      expect(earlyInviteInfo.allCandidatesLength).toBeGreaterThan(0)
      
      // Verify the spy captured the RTCPeer instance correctly
      const spyCall = earlyInviteInfo.spyCalls[0]
      expect(spyCall.args).toHaveLength(1)
      expect(spyCall.data.type).toBe('offer')
      expect(spyCall.data.candidateCount).toBeGreaterThan(0)
      
      // If early invite worked, we should have a snapshot of candidates
      if (earlyInviteInfo.candidatesSnapshotLength > 0) {
        expect(earlyInviteInfo.candidatesSnapshotLength).toBeLessThanOrEqual(earlyInviteInfo.allCandidatesLength)
      }

      // Clean up
      await page.evaluate(() => {
        const testPeer = (globalThis as any).earlyInvitePeer
        testPeer.rtcPeer.stop()
      })
    })
  })

  test('should handle RTCPeer connection failure and recovery', async ({ page }) => {
    // Create RTCPeer with invalid TURN server to simulate failure
    const invalidIceServers = [
      {
        urls: 'turn:invalid.server:3478',
        username: 'invalid',
        credential: 'invalid',
      },
    ]

    await createTestRTCPeer(page, invalidIceServers, 'failurePeer')

    // Try to start with invalid TURN server
    await page.evaluate(async () => {
      const testPeer = (globalThis as any).failurePeer
      
      testPeer.rtcPeer.call.options.audio = true
      testPeer.rtcPeer.start().catch((error: any) => {
        console.log('Expected start failure:', error)
      })
    })

    // Wait a bit for connection attempt
    await page.waitForTimeout(3000)

    // Now create a new RTCPeer with valid TURN servers for recovery
    await createTestRTCPeer(page, iceServers, 'recoveryPeer')

    // Try connection with valid TURN servers
    await page.evaluate(async () => {
      const testPeer = (globalThis as any).recoveryPeer
      testPeer.rtcPeer.call.options.audio = true
      
      testPeer.rtcPeer.start().catch((error: any) => {
        console.log('Recovery start method rejected as expected:', error)
      })
    })

    // Wait for onLocalSDPReady on recovery peer
    await waitForOnLocalSDPReady(page, 'recoveryPeer')
    
    // Wait for ICE gathering on recovery peer
    await waitForIceGatheringComplete(page, 'recoveryPeer')

    const recoveryInfo = await page.evaluate(() => {
      const recoveryPeer = (globalThis as any).recoveryPeer
      
      return {
        candidatesGathered: recoveryPeer.rtcPeer._allCandidates?.length || 0,
        iceGatheringState: recoveryPeer.rtcPeer.instance.iceGatheringState,
        connectionState: recoveryPeer.rtcPeer.instance.connectionState,
        onLocalSDPReadyCalled: recoveryPeer.rtcPeer.call._onLocalSDPReadyCallCount,
      }
    })

    console.log('Recovery info:', recoveryInfo)

    // Verify recovery worked
    expect(recoveryInfo.candidatesGathered).toBeGreaterThan(0)
    expect(['complete', 'gathering']).toContain(recoveryInfo.iceGatheringState)
    expect(recoveryInfo.onLocalSDPReadyCalled).toBe(1)

    // Clean up
    await page.evaluate(() => {
      const failurePeer = (globalThis as any).failurePeer
      const recoveryPeer = (globalThis as any).recoveryPeer
      failurePeer.rtcPeer.stop()
      recoveryPeer.rtcPeer.stop()
    })
  })

  test('should collect comprehensive RTCPeer test metrics', async ({ page }) => {
    // Create a comprehensive RTCPeer test
    await createTestRTCPeer(page, iceServers, 'metricsPeer')

    // Set up comprehensive metrics collection
    await page.evaluate(() => {
      const testPeer = (globalThis as any).metricsPeer
      
      testPeer.metrics = {
        startTime: Date.now(),
        iceGatheringDuration: 0,
        onLocalSDPReadyDuration: 0,
        candidateTypes: {} as Record<string, number>,
        totalCandidates: 0,
        onLocalSDPReadyCallCount: 0,
      }
      
      // Configure for comprehensive test
      testPeer.rtcPeer.call.options.audio = true
      testPeer.rtcPeer.call.options.video = true
      testPeer.rtcPeer.call.options.negotiateAudio = true
      testPeer.rtcPeer.call.options.negotiateVideo = true
      
      // Track metrics
      const originalOnLocalSDPReady = testPeer.rtcPeer.call.onLocalSDPReady.bind(testPeer.rtcPeer.call)
      testPeer.rtcPeer.call.onLocalSDPReady = function(rtcPeer: any) {
        testPeer.metrics.onLocalSDPReadyCallCount++
        testPeer.metrics.onLocalSDPReadyDuration = Date.now() - testPeer.metrics.startTime
        return originalOnLocalSDPReady(rtcPeer)
      }
    })

    // Start the comprehensive test
    await page.evaluate(async () => {
      const testPeer = (globalThis as any).metricsPeer
      
      testPeer.rtcPeer.start().catch((error: any) => {
        console.log('Metrics start method rejected as expected:', error)
      })
    })

    // Wait for onLocalSDPReady
    await waitForOnLocalSDPReady(page, 'metricsPeer')
    
    // Wait for ICE gathering
    const candidates = await waitForIceGatheringComplete(page, 'metricsPeer')
    
    console.log(`Gathered ${candidates.length} candidates`)

    // Collect final metrics
    const metrics = await page.evaluate(() => {
      const testPeer = (globalThis as any).metricsPeer
      const candidates = testPeer.rtcPeer._allCandidates || []
      
      // Count candidate types
      const candidateTypes: Record<string, number> = {}
      candidates.forEach((c: RTCIceCandidate) => {
        candidateTypes[c.type] = (candidateTypes[c.type] || 0) + 1
      })
      
      return {
        ...testPeer.metrics,
        iceGatheringState: testPeer.rtcPeer.instance.iceGatheringState,
        connectionState: testPeer.rtcPeer.instance.connectionState,
        candidatesCount: candidates.length,
        candidateTypes,
        iceGatheringDuration: testPeer.rtcPeer.instance.iceGatheringState === 'complete' ? 
          Date.now() - testPeer.metrics.startTime : testPeer.metrics.iceGatheringDuration,
        candidateDetails: candidates.slice(0, 5).map((c: RTCIceCandidate) => ({
          type: c.type,
          protocol: c.protocol,
          address: c.address,
          port: c.port,
          foundation: c.foundation,
        })),
      }
    })

    console.log('Comprehensive RTCPeer test metrics:', JSON.stringify(metrics, null, 2))

    // Verify metrics
    expect(candidates.length).toBeGreaterThan(0)
    expect(metrics.candidatesCount).toBeGreaterThan(0)
    expect(metrics.onLocalSDPReadyCallCount).toBe(1) // Early invite requirement
    expect(metrics.candidatesCount).toBeGreaterThan(0) // Verify real ICE gathering worked
    expect(metrics.onLocalSDPReadyDuration).toBeGreaterThanOrEqual(0)
    expect(['complete', 'gathering']).toContain(metrics.iceGatheringState)
    if (metrics.candidatesCount > 0) {
      expect(Object.keys(metrics.candidateTypes)).toContain('host')
    }

    // Generate test report with real RTCPeer data
    const testReport = {
      testName: 'Real RTCPeer Comprehensive Metrics',
      timestamp: new Date().toISOString(),
      browser: await page.evaluate(() => navigator.userAgent),
      metrics,
      turnServerConfig: turnServer.getConfig(),
      rtcPeerImplementation: 'REAL',
      bundlePath: 'packages/webrtc/dist/rtcpeer.umd.js',
    }

    console.log('Final Real RTCPeer Test Report:', JSON.stringify(testReport, null, 2))

    // Clean up
    await page.evaluate(() => {
      const testPeer = (globalThis as any).metricsPeer
      testPeer.rtcPeer.stop()
    })
  })
})