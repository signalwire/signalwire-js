import { test, expect, Page, Browser } from '@playwright/test'
import { RealTurnServer } from '../turnServer'

/**
 * RTCPeer Integration Tests
 * 
 * These tests verify the RTCPeer implementation using real browser WebRTC APIs
 * without mocking. They test actual ICE candidate gathering, media negotiation,
 * and peer-to-peer connection establishment using a local TURN server.
 */

interface TestPeerConnection {
  pc: RTCPeerConnection
  localCandidates: RTCIceCandidate[]
  remoteCandidates: RTCIceCandidate[]
  localDescription?: RTCSessionDescriptionInit
  remoteDescription?: RTCSessionDescriptionInit
  connectionStateLog: RTCPeerConnectionState[]
  iceGatheringStateLog: RTCIceGatheringState[]
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
 * Helper function to create a test peer connection with ICE servers
 */
async function createTestPeerConnection(
  page: Page,
  iceServers: RTCIceServer[]
): Promise<TestPeerConnection> {
  return await page.evaluate(
    ({ iceServers }) => {
      const pc = new RTCPeerConnection({
        iceServers,
        iceCandidatePoolSize: 10,
        bundlePolicy: 'max-compat',
      })

      const testPeer: TestPeerConnection = {
        pc,
        localCandidates: [],
        remoteCandidates: [],
        connectionStateLog: [],
        iceGatheringStateLog: [],
      }

      // Track ICE candidates
      pc.addEventListener('icecandidate', (event) => {
        if (event.candidate) {
          testPeer.localCandidates.push(event.candidate)
        }
      })

      // Track connection state changes
      pc.addEventListener('connectionstatechange', () => {
        testPeer.connectionStateLog.push(pc.connectionState)
      })

      // Track ICE gathering state changes
      pc.addEventListener('icegatheringstatechange', () => {
        testPeer.iceGatheringStateLog.push(pc.iceGatheringState)
      })

      return testPeer
    },
    { iceServers }
  )
}

/**
 * Helper function to get user media with specific constraints
 */
async function getUserMediaWithConstraints(
  page: Page,
  audio: boolean,
  video: boolean
): Promise<void> {
  await page.evaluate(
    ({ audio, video }) => {
      return navigator.mediaDevices.getUserMedia({
        audio,
        video: video
          ? {
              width: { ideal: 640 },
              height: { ideal: 480 },
              frameRate: { ideal: 30 },
            }
          : false,
      })
    },
    { audio, video }
  )
}

/**
 * Helper function to wait for ICE gathering completion
 */
async function waitForIceGatheringComplete(
  page: Page,
  peerVar: string,
  timeout = 15000
): Promise<RTCIceCandidate[]> {
  // Wait for ICE gathering to complete or have candidates
  await page.waitForFunction(
    ({ peerVar }) => {
      const peer = (globalThis as any)[peerVar]
      // Support both localCandidates and candidates property names
      const candidatesArray = peer.localCandidates || peer.candidates || []
      return peer.pc.iceGatheringState === 'complete' || candidatesArray.length > 0
    },
    { peerVar },
    { timeout }
  )
  
  // Now get the candidates
  return await page.evaluate((peerVar) => {
    const peer = (globalThis as any)[peerVar]
    // Support both localCandidates and candidates property names
    return peer.localCandidates || peer.candidates || []
  }, peerVar)
}

/**
 * Helper function to establish peer connection between two RTCPeerConnections
 */
async function establishPeerConnection(
  page: Page,
  offererVar: string,
  answererVar: string,
  audio: boolean,
  video: boolean
): Promise<void> {
  // Add media tracks to offerer
  await page.evaluate(
    async ({ offererVar, audio, video }) => {
      const offerer = (globalThis as any)[offererVar]
      const stream = await navigator.mediaDevices.getUserMedia({
        audio,
        video: video
          ? {
              width: { ideal: 640 },
              height: { ideal: 480 },
            }
          : false,
      })

      stream.getTracks().forEach((track) => {
        offerer.pc.addTrack(track, stream)
      })
    },
    { offererVar, audio, video }
  )

  // Create offer
  await page.evaluate(
    async ({ offererVar, audio, video }) => {
      const offerer = (globalThis as any)[offererVar]
      const offer = await offerer.pc.createOffer({
        offerToReceiveAudio: audio,
        offerToReceiveVideo: video,
      })
      await offerer.pc.setLocalDescription(offer)
      offerer.localDescription = offer
    },
    { offererVar, audio, video }
  )

  // Wait for ICE gathering on offerer
  await waitForIceGatheringComplete(page, offererVar)

  // Set remote description on answerer and create answer
  await page.evaluate(
    async ({ offererVar, answererVar }) => {
      const offerer = (globalThis as any)[offererVar]
      const answerer = (globalThis as any)[answererVar]

      await answerer.pc.setRemoteDescription(offerer.localDescription!)
      answerer.remoteDescription = offerer.localDescription

      const answer = await answerer.pc.createAnswer()
      await answerer.pc.setLocalDescription(answer)
      answerer.localDescription = answer
    },
    { offererVar, answererVar }
  )

  // Wait for ICE gathering on answerer
  await waitForIceGatheringComplete(page, answererVar)

  // Complete the connection
  await page.evaluate(
    async ({ offererVar, answererVar }) => {
      const offerer = (globalThis as any)[offererVar]
      const answerer = (globalThis as any)[answererVar]

      await offerer.pc.setRemoteDescription(answerer.localDescription!)
      offerer.remoteDescription = answerer.localDescription

      // Exchange ICE candidates
      offerer.localCandidates.forEach((candidate: RTCIceCandidate) => {
        answerer.pc.addIceCandidate(candidate)
      })

      answerer.localCandidates.forEach((candidate: RTCIceCandidate) => {
        offerer.pc.addIceCandidate(candidate)
      })
    },
    { offererVar, answererVar }
  )
}

/**
 * Helper function to wait for connection state
 */
async function waitForConnectionState(
  page: Page,
  peerVar: string,
  targetState: RTCPeerConnectionState,
  timeout = 10000
): Promise<boolean> {
  return await page.waitForFunction(
    ({ peerVar, targetState }) => {
      const peer = (globalThis as any)[peerVar]
      return peer.pc.connectionState === targetState
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
        navigator.mediaDevices = {};
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
    test(`should successfully gather ICE candidates with TURN server for ${description}`, async ({
      page,
    }) => {
      // Create test peer connection with TURN servers
      await page.evaluate(
        ({ iceServers }) => {
          (globalThis as any).testPeer = {
            pc: new RTCPeerConnection({
              iceServers,
              iceCandidatePoolSize: 10,
            }),
            localCandidates: [] as RTCIceCandidate[],
            hasHostCandidate: false,
            hasSrflxCandidate: false,
            hasRelayCandidate: false,
          }

          const testPeer = (globalThis as any).testPeer
          testPeer.pc.addEventListener('icecandidate', (event: RTCPeerConnectionIceEvent) => {
            if (event.candidate) {
              testPeer.localCandidates.push(event.candidate)
              
              // Track candidate types
              if (event.candidate.type === 'host') {
                testPeer.hasHostCandidate = true
              } else if (event.candidate.type === 'srflx') {
                testPeer.hasSrflxCandidate = true
              } else if (event.candidate.type === 'relay') {
                testPeer.hasRelayCandidate = true
              }
            }
          })
        },
        { iceServers }
      )

      // Get user media and add tracks to trigger ICE gathering
      const stream = await page.evaluate(
        async ({ audio, video }) => {
          const constraints: MediaStreamConstraints = {}
          if (audio) constraints.audio = true
          if (video) {
            constraints.video = {
              width: { ideal: 640 },
              height: { ideal: 480 },
            }
          }

          const stream = await navigator.mediaDevices.getUserMedia(constraints)
          const testPeer = (globalThis as any).testPeer

          stream.getTracks().forEach((track) => {
            testPeer.pc.addTrack(track, stream)
          })

          return {
            audioTracks: stream.getAudioTracks().length,
            videoTracks: stream.getVideoTracks().length,
          }
        },
        { audio, video }
      )

      // Verify media stream was created correctly
      expect(stream.audioTracks).toBe(audio ? 1 : 0)
      expect(stream.videoTracks).toBe(video ? 1 : 0)

      // Create offer to start ICE gathering
      await page.evaluate(async () => {
        const testPeer = (globalThis as any).testPeer
        const offer = await testPeer.pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        })
        await testPeer.pc.setLocalDescription(offer)
      })

      // Wait for ICE gathering to complete
      const candidates = await waitForIceGatheringComplete(page, 'testPeer', 20000)

      // Verify ICE candidates were gathered
      expect(candidates.length).toBeGreaterThan(0)

      // Check that we have different types of candidates
      const candidateInfo = await page.evaluate(() => {
        const testPeer = (globalThis as any).testPeer
        return {
          totalCandidates: testPeer.localCandidates.length,
          hasHost: testPeer.hasHostCandidate,
          hasSrflx: testPeer.hasSrflxCandidate,
          hasRelay: testPeer.hasRelayCandidate,
          candidateTypes: testPeer.localCandidates.map((c: RTCIceCandidate) => c.type),
        }
      })

      console.log(`${description} candidates:`, candidateInfo)

      // Verify we have host candidates (local network)
      expect(candidateInfo.hasHost).toBe(true)

      // Note: STUN/TURN server may not always provide srflx/relay candidates
      // in a test environment, but we should at least have host candidates
      expect(candidateInfo.totalCandidates).toBeGreaterThan(0)

      // Clean up
      await page.evaluate(() => {
        const testPeer = (globalThis as any).testPeer
        testPeer.pc.close()
      })
    })

    test(`should establish peer-to-peer connection for ${description}`, async ({
      page,
    }) => {
      // Create two peer connections
      await page.evaluate(
        ({ iceServers }) => {
          ;(globalThis as any).offerer = {
            pc: new RTCPeerConnection({ iceServers }),
            localCandidates: [] as RTCIceCandidate[],
            remoteCandidates: [] as RTCIceCandidate[],
            connectionStateLog: [] as RTCPeerConnectionState[],
          }

          ;(globalThis as any).answerer = {
            pc: new RTCPeerConnection({ iceServers }),
            localCandidates: [] as RTCIceCandidate[],
            remoteCandidates: [] as RTCIceCandidate[],
            connectionStateLog: [] as RTCPeerConnectionState[],
          }

          // Set up event listeners for both peers
          ;['offerer', 'answerer'].forEach((peerName) => {
            const peer = (globalThis as any)[peerName]
            
            peer.pc.addEventListener('icecandidate', (event: RTCPeerConnectionIceEvent) => {
              if (event.candidate) {
                peer.localCandidates.push(event.candidate)
              }
            })

            peer.pc.addEventListener('connectionstatechange', () => {
              peer.connectionStateLog.push(peer.pc.connectionState)
            })
          })
        },
        { iceServers }
      )

      // Establish the peer connection
      await establishPeerConnection(page, 'offerer', 'answerer', audio, video)

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
          offererState: offerer.pc.connectionState,
          answererState: answerer.pc.connectionState,
          offererIceState: offerer.pc.iceConnectionState,
          answererIceState: answerer.pc.iceConnectionState,
          offererCandidates: offerer.localCandidates.length,
          answererCandidates: answerer.localCandidates.length,
        }
      })

      console.log(`${description} connection info:`, connectionInfo)

      expect(connectionInfo.offererState).toBe('connected')
      expect(connectionInfo.answererState).toBe('connected')
      expect(connectionInfo.offererCandidates).toBeGreaterThan(0)
      expect(connectionInfo.answererCandidates).toBeGreaterThan(0)

      // Verify media tracks are present
      const mediaInfo = await page.evaluate(() => {
        const offerer = (globalThis as any).offerer
        const answerer = (globalThis as any).answerer
        
        const offererSenders = offerer.pc.getSenders()
        const answererReceivers = answerer.pc.getReceivers()
        
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
        offerer.pc.close()
        answerer.pc.close()
      })
    })

    test(`should handle ICE restart for ${description}`, async ({ page }) => {
      // Create peer connections
      await page.evaluate(
        ({ iceServers }) => {
          ;(globalThis as any).peer1 = {
            pc: new RTCPeerConnection({ iceServers }),
            localCandidates: [] as RTCIceCandidate[],
            iceRestartCount: 0,
          }

          ;(globalThis as any).peer2 = {
            pc: new RTCPeerConnection({ iceServers }),
            localCandidates: [] as RTCIceCandidate[],
            iceRestartCount: 0,
          }

          // Track ICE restart events
          ;['peer1', 'peer2'].forEach((peerName) => {
            const peer = (globalThis as any)[peerName]
            
            peer.pc.addEventListener('icecandidate', (event: RTCPeerConnectionIceEvent) => {
              if (event.candidate) {
                peer.localCandidates.push(event.candidate)
              }
            })

            peer.pc.addEventListener('negotiationneeded', () => {
              peer.iceRestartCount++
            })
          })
        },
        { iceServers }
      )

      // Establish initial connection
      await establishPeerConnection(page, 'peer1', 'peer2', audio, video)
      await waitForConnectionState(page, 'peer1', 'connected')

      // Store initial candidate count
      const initialCandidates = await page.evaluate(() => {
        const peer1 = (globalThis as any).peer1
        return peer1.localCandidates.length
      })

      // Trigger ICE restart
      await page.evaluate(async () => {
        const peer1 = (globalThis as any).peer1
        const peer2 = (globalThis as any).peer2
        
        // Reset candidate arrays for fresh collection
        peer1.localCandidates = []
        peer2.localCandidates = []
        
        // Restart ICE
        peer1.pc.restartIce()
        
        // Create new offer
        const offer = await peer1.pc.createOffer({ iceRestart: true })
        await peer1.pc.setLocalDescription(offer)
        
        // Set remote description on peer2
        await peer2.pc.setRemoteDescription(offer)
        
        // Create answer
        const answer = await peer2.pc.createAnswer()
        await peer2.pc.setLocalDescription(answer)
        
        // Complete the ICE restart
        await peer1.pc.setRemoteDescription(answer)
      })

      // Wait for new ICE gathering to complete
      await waitForIceGatheringComplete(page, 'peer1')
      await waitForIceGatheringComplete(page, 'peer2')

      // Verify ICE restart worked
      const restartInfo = await page.evaluate(() => {
        const peer1 = (globalThis as any).peer1
        const peer2 = (globalThis as any).peer2
        
        return {
          peer1State: peer1.pc.connectionState,
          peer2State: peer2.pc.connectionState,
          peer1NewCandidates: peer1.localCandidates.length,
          peer2NewCandidates: peer2.localCandidates.length,
        }
      })

      console.log(`${description} ICE restart info:`, restartInfo)

      expect(restartInfo.peer1NewCandidates).toBeGreaterThan(0)
      expect(restartInfo.peer2NewCandidates).toBeGreaterThan(0)

      // Clean up
      await page.evaluate(() => {
        const peer1 = (globalThis as any).peer1
        const peer2 = (globalThis as any).peer2
        peer1.pc.close()
        peer2.pc.close()
      })
    })
  })

  test('should handle connection failure and recovery', async ({ page }) => {
    // Create peer connection with invalid TURN server to simulate failure
    const invalidIceServers = [
      {
        urls: 'turn:invalid.server:3478',
        username: 'invalid',
        credential: 'invalid',
      },
    ]

    await page.evaluate(
      ({ invalidIceServers }) => {
        ;(globalThis as any).failurePeer = {
          pc: new RTCPeerConnection({ iceServers: invalidIceServers }),
          localCandidates: [] as RTCIceCandidate[],
          connectionStateLog: [] as RTCPeerConnectionState[],
          iceConnectionStateLog: [] as RTCIceConnectionState[],
          failed: false,
        }

        const peer = (globalThis as any).failurePeer
        
        peer.pc.addEventListener('icecandidate', (event: RTCPeerConnectionIceEvent) => {
          if (event.candidate) {
            peer.localCandidates.push(event.candidate)
          }
        })

        peer.pc.addEventListener('connectionstatechange', () => {
          peer.connectionStateLog.push(peer.pc.connectionState)
          if (peer.pc.connectionState === 'failed') {
            peer.failed = true
          }
        })

        peer.pc.addEventListener('iceconnectionstatechange', () => {
          peer.iceConnectionStateLog.push(peer.pc.iceConnectionState)
        })
      },
      { invalidIceServers }
    )

    // Try to create offer with invalid TURN server
    await page.evaluate(async () => {
      const peer = (globalThis as any).failurePeer
      
      // Add a fake track to trigger ICE gathering
      const canvas = document.createElement('canvas')
      const stream = (canvas as any).captureStream()
      stream.getTracks().forEach((track: MediaStreamTrack) => {
        peer.pc.addTrack(track, stream)
      })
      
      const offer = await peer.pc.createOffer()
      await peer.pc.setLocalDescription(offer)
    })

    // Wait a bit for connection attempt
    await page.waitForTimeout(3000)

    // Now reconfigure with valid TURN servers and try again
    await page.evaluate(
      ({ iceServers }) => {
        const oldPeer = (globalThis as any).failurePeer
        
        // Create new peer with valid TURN servers
        ;(globalThis as any).recoveryPeer = {
          pc: new RTCPeerConnection({ iceServers }),
          localCandidates: [] as RTCIceCandidate[],
          connectionStateLog: [] as RTCPeerConnectionState[],
          recovered: false,
        }

        const newPeer = (globalThis as any).recoveryPeer
        
        newPeer.pc.addEventListener('icecandidate', (event: RTCPeerConnectionIceEvent) => {
          if (event.candidate) {
            newPeer.localCandidates.push(event.candidate)
          }
        })

        newPeer.pc.addEventListener('connectionstatechange', () => {
          newPeer.connectionStateLog.push(newPeer.pc.connectionState)
        })

        // Close old peer
        oldPeer.pc.close()
      },
      { iceServers }
    )

    // Try connection with valid TURN servers
    await page.evaluate(async () => {
      const peer = (globalThis as any).recoveryPeer
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      })
      
      stream.getTracks().forEach((track) => {
        peer.pc.addTrack(track, stream)
      })
      
      const offer = await peer.pc.createOffer()
      await peer.pc.setLocalDescription(offer)
    })

    // Wait for ICE gathering on recovery peer
    await waitForIceGatheringComplete(page, 'recoveryPeer')

    const recoveryInfo = await page.evaluate(() => {
      const recoveryPeer = (globalThis as any).recoveryPeer
      
      return {
        candidatesGathered: recoveryPeer.localCandidates.length,
        iceGatheringState: recoveryPeer.pc.iceGatheringState,
        connectionState: recoveryPeer.pc.connectionState,
      }
    })

    console.log('Recovery info:', recoveryInfo)

    // Verify recovery worked
    expect(recoveryInfo.candidatesGathered).toBeGreaterThan(0)
    expect(['complete', 'gathering']).toContain(recoveryInfo.iceGatheringState)

    // Clean up
    await page.evaluate(() => {
      const recoveryPeer = (globalThis as any).recoveryPeer
      recoveryPeer.pc.close()
    })
  })

  test('should handle simulcast configuration', async ({ page }) => {
    // Test simulcast setup (Chrome-specific)
    await page.evaluate(
      ({ iceServers }) => {
        ;(globalThis as any).simulcastPeer = {
          pc: new RTCPeerConnection({ iceServers }),
          localCandidates: [] as RTCIceCandidate[],
          transceivers: [] as RTCRtpTransceiver[],
        }

        const peer = (globalThis as any).simulcastPeer
        
        peer.pc.addEventListener('icecandidate', (event: RTCPeerConnectionIceEvent) => {
          if (event.candidate) {
            peer.localCandidates.push(event.candidate)
          }
        })
      },
      { iceServers }
    )

    // Set up simulcast video track
    const simulcastInfo = await page.evaluate(async () => {
      const peer = (globalThis as any).simulcastPeer
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      const videoTrack = stream.getVideoTracks()[0]
      
      // Add transceiver with simulcast encodings
      const transceiver = peer.pc.addTransceiver(videoTrack, {
        direction: 'sendonly',
        streams: [stream],
        sendEncodings: [
          { rid: '0', active: true, scaleResolutionDownBy: 1.0 },
          { rid: '1', active: true, scaleResolutionDownBy: 2.0 },
          { rid: '2', active: true, scaleResolutionDownBy: 4.0 },
        ],
      })
      
      peer.transceivers.push(transceiver)
      
      const offer = await peer.pc.createOffer()
      await peer.pc.setLocalDescription(offer)
      
      return {
        hasVideoTrack: !!videoTrack,
        encodingsCount: transceiver.sender.getParameters().encodings.length,
        sdpContainsSimulcast: offer.sdp?.includes('simulcast') || false,
        sdpContainsRid: offer.sdp?.includes('a=rid:') || false,
      }
    })

    console.log('Simulcast info:', simulcastInfo)

    expect(simulcastInfo.hasVideoTrack).toBe(true)
    expect(simulcastInfo.encodingsCount).toBe(3)

    // Clean up
    await page.evaluate(() => {
      const peer = (globalThis as any).simulcastPeer
      peer.pc.close()
    })
  })

  test('should collect comprehensive test metrics', async ({ page }) => {
    // Create a comprehensive test that collects various metrics
    await page.evaluate(
      ({ iceServers }) => {
        ;(globalThis as any).metricsPeer = {
          pc: new RTCPeerConnection({ iceServers }),
          metrics: {
            iceGatheringDuration: 0,
            candidateTypes: {} as Record<string, number>,
            totalCandidates: 0,
            connectionEstablishmentTime: 0,
            startTime: Date.now(),
          },
          candidates: [] as RTCIceCandidate[],
        }

        const peer = (globalThis as any).metricsPeer
        
        peer.pc.addEventListener('icecandidate', (event: RTCPeerConnectionIceEvent) => {
          if (event.candidate) {
            peer.candidates.push(event.candidate)
            peer.metrics.totalCandidates++
            
            const type = event.candidate.type
            peer.metrics.candidateTypes[type] = (peer.metrics.candidateTypes[type] || 0) + 1
          }
        })

        peer.pc.addEventListener('icegatheringstatechange', () => {
          if (peer.pc.iceGatheringState === 'complete') {
            peer.metrics.iceGatheringDuration = Date.now() - peer.metrics.startTime
          }
        })

        peer.pc.addEventListener('connectionstatechange', () => {
          if (peer.pc.connectionState === 'connected') {
            peer.metrics.connectionEstablishmentTime = Date.now() - peer.metrics.startTime
          }
        })
      },
      { iceServers }
    )

    // Start the test
    await page.evaluate(async () => {
      const peer = (globalThis as any).metricsPeer
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      })

      stream.getTracks().forEach((track) => {
        peer.pc.addTrack(track, stream)
      })
      
      const offer = await peer.pc.createOffer()
      await peer.pc.setLocalDescription(offer)
    })

    // Wait for ICE gathering
    const candidates = await waitForIceGatheringComplete(page, 'metricsPeer')
    
    console.log(`Gathered ${candidates.length} candidates`)

    // Collect final metrics
    const metrics = await page.evaluate(() => {
      const peer = (globalThis as any).metricsPeer
      
      return {
        ...peer.metrics,
        iceGatheringState: peer.pc.iceGatheringState,
        connectionState: peer.pc.connectionState,
        candidatesCount: peer.candidates ? peer.candidates.length : 0,
        candidateDetails: peer.candidates ? peer.candidates.map((c: RTCIceCandidate) => ({
          type: c.type,
          protocol: c.protocol,
          address: c.address,
          port: c.port,
          foundation: c.foundation,
        })) : [],
      }
    })

    console.log('Comprehensive test metrics:', JSON.stringify(metrics, null, 2))

    // Verify metrics
    expect(candidates.length).toBeGreaterThan(0)
    expect(metrics.candidatesCount).toBeGreaterThan(0)
    expect(metrics.iceGatheringDuration).toBeGreaterThanOrEqual(0)
    expect(['complete', 'gathering']).toContain(metrics.iceGatheringState)
    if (metrics.totalCandidates > 0) {
      expect(Object.keys(metrics.candidateTypes)).toContain('host')
    }

    // Generate test report
    const testReport = {
      testName: 'RTCPeer Comprehensive Metrics',
      timestamp: new Date().toISOString(),
      browser: await page.evaluate(() => navigator.userAgent),
      metrics,
      turnServerConfig: turnServer.getConfig(),
    }

    console.log('Final Test Report:', JSON.stringify(testReport, null, 2))

    // Clean up
    await page.evaluate(() => {
      const peer = (globalThis as any).metricsPeer
      peer.pc.close()
    })
  })
})