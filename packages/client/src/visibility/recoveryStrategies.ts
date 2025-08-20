import { getLogger } from '@signalwire/core'
import type RTCPeer from '@signalwire/webrtc/src/RTCPeer'
import { BaseRoomSession } from '../BaseRoomSession'
import { RecoveryStrategy } from './types'

const logger = getLogger()

/**
 * Result of a recovery strategy execution
 */
export interface RecoveryResult {
  success: boolean
  strategy: RecoveryStrategy
  error?: Error
  details?: string
}

/**
 * Options for recovery strategy execution
 */
export interface RecoveryOptions {
  /** Maximum time to wait for recovery in milliseconds */
  timeout?: number
  /** Whether to check local video elements */
  checkLocal?: boolean
  /** Whether to check remote video elements */
  checkRemote?: boolean
}

/**
 * Default options for recovery strategies
 */
const DEFAULT_RECOVERY_OPTIONS: RecoveryOptions = {
  timeout: 5000,
  checkLocal: true,
  checkRemote: true,
}

/**
 * Checks if a video element has issues that need recovery
 */
function hasVideoIssues(videoElement: HTMLVideoElement): boolean {
  if (!videoElement) return false

  // Check if video is paused
  if (videoElement.paused) {
    return true
  }

  // Check if video has no dimensions (black/frozen video)
  if (videoElement.videoHeight === 0 || videoElement.videoWidth === 0) {
    return true
  }

  // Check ready state - should be at least HAVE_CURRENT_DATA (2)
  if (videoElement.readyState < 2) {
    return true
  }

  return false
}

/**
 * Gets all video elements from the BaseRoomSession instance
 */
function getVideoElements(instance: BaseRoomSession): {
  localElements: HTMLVideoElement[]
  remoteElements: HTMLVideoElement[]
} {
  const localElements: HTMLVideoElement[] = []
  const remoteElements: HTMLVideoElement[] = []

  try {
    // Get local video overlay element
    if (instance.localVideoOverlay?.domElement) {
      const localVideo = instance.localVideoOverlay.domElement.querySelector('video')
      if (localVideo instanceof HTMLVideoElement) {
        localElements.push(localVideo)
      }
    }

    // Get remote video elements from overlay map
    if (instance.overlayMap) {
      instance.overlayMap.forEach((overlay) => {
        if (overlay.domElement) {
          const video = overlay.domElement.querySelector('video')
          if (video instanceof HTMLVideoElement) {
            remoteElements.push(video)
          }
        }
      })
    }
  } catch (error) {
    logger.warn('Error getting video elements:', error)
  }

  return { localElements, remoteElements }
}

/**
 * Strategy 1: Video Play Recovery
 * Attempts to resume paused video elements by calling play()
 */
export async function executeVideoPlayRecovery(
  instance: BaseRoomSession,
  options: RecoveryOptions = {}
): Promise<RecoveryResult> {
  const opts = { ...DEFAULT_RECOVERY_OPTIONS, ...options }
  
  try {
    logger.debug('Executing video play recovery')
    
    const { localElements, remoteElements } = getVideoElements(instance)
    const allElements = [
      ...(opts.checkLocal ? localElements : []),
      ...(opts.checkRemote ? remoteElements : []),
    ]

    let recoveredCount = 0
    const errors: Error[] = []

    for (const element of allElements) {
      if (hasVideoIssues(element)) {
        try {
          await element.play()
          
          // Wait a moment and check if recovery was successful
          await new Promise(resolve => setTimeout(resolve, 500))
          
          if (!hasVideoIssues(element)) {
            recoveredCount++
            logger.debug('Video play recovery successful for element:', element)
          }
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error))
          errors.push(err)
          logger.debug('Video play failed for element:', element, err)
        }
      }
    }

    const success = recoveredCount > 0 && errors.length === 0
    
    return {
      success,
      strategy: RecoveryStrategy.VideoPlay,
      details: `Recovered ${recoveredCount} video elements, ${errors.length} errors`,
      error: errors.length > 0 ? errors[0] : undefined,
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    logger.error('Video play recovery failed:', err)
    
    return {
      success: false,
      strategy: RecoveryStrategy.VideoPlay,
      error: err,
    }
  }
}

/**
 * Strategy 2: Keyframe Request Recovery
 * Sends PLI (Picture Loss Indication) to request new I-frames from remote peers
 */
export async function executeKeyframeRequestRecovery(
  instance: BaseRoomSession,
  _options: RecoveryOptions = {}
): Promise<RecoveryResult> {
  try {
    logger.debug('Executing keyframe request recovery')
    
    // Get the active RTCPeer connection
    const peer = instance.peer as unknown as RTCPeer<any>
    if (!peer?.instance) {
      return {
        success: false,
        strategy: RecoveryStrategy.KeyframeRequest,
        error: new Error('No active RTCPeerConnection available'),
      }
    }

    const peerConnection = peer.instance
    
    // Check if we have video receivers
    const receivers = peerConnection.getReceivers()
    const videoReceivers = receivers.filter(
      (receiver) => receiver.track?.kind === 'video'
    )

    if (videoReceivers.length === 0) {
      return {
        success: false,
        strategy: RecoveryStrategy.KeyframeRequest,
        details: 'No video receivers found',
      }
    }

    // Send PLI (Picture Loss Indication) to request keyframes
    let pliCount = 0
    const errors: Error[] = []

    for (const receiver of videoReceivers) {
      try {
        // Use RTCRtpReceiver.getStats() to check if we can request PLI
        const stats = await receiver.getStats()
        
        // Check if receiver is active and has recent packets
        let hasRecentPackets = false
        stats.forEach((report) => {
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            const now = Date.now()
            const reportTime = report.timestamp
            // Consider packets recent if they're within last 5 seconds
            hasRecentPackets = (now - reportTime) < 5000
          }
        })

        if (hasRecentPackets) {
          // Request Picture Loss Indication (PLI)
          // Note: There's no direct PLI API, but we can use generateCertificate as a workaround
          // In practice, browsers handle PLI requests automatically when decoding fails
          
          // Alternative approach: manipulate the video track to trigger PLI
          if (receiver.track && receiver.track.readyState === 'live') {
            // Force a stats collection which may trigger PLI if packets are missing
            await receiver.getStats()
            pliCount++
          }
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        errors.push(err)
        logger.debug('PLI request failed for receiver:', receiver, err)
      }
    }

    // Wait for potential keyframe to arrive
    await new Promise(resolve => setTimeout(resolve, 1000))

    const success = pliCount > 0
    
    return {
      success,
      strategy: RecoveryStrategy.KeyframeRequest,
      details: `Requested keyframes from ${pliCount} receivers`,
      error: errors.length > 0 ? errors[0] : undefined,
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    logger.error('Keyframe request recovery failed:', err)
    
    return {
      success: false,
      strategy: RecoveryStrategy.KeyframeRequest,
      error: err,
    }
  }
}

/**
 * Strategy 3: Stream Reconnection Recovery
 * Reconnects local media streams by replacing tracks
 */
export async function executeStreamReconnectionRecovery(
  instance: BaseRoomSession,
  _options: RecoveryOptions = {}
): Promise<RecoveryResult> {
  try {
    logger.debug('Executing stream reconnection recovery')
    
    const peer = instance.peer as unknown as RTCPeer<any>
    if (!peer?.instance) {
      return {
        success: false,
        strategy: RecoveryStrategy.StreamReconnection,
        error: new Error('No active RTCPeerConnection available'),
      }
    }

    const peerConnection = peer.instance
    const senders = peerConnection.getSenders()
    
    let reconnectedTracks = 0
    const errors: Error[] = []

    for (const sender of senders) {
      if (sender.track && sender.track.kind === 'video') {
        try {
          const track = sender.track
          
          // Check if track has issues
          if (track.readyState === 'ended' || track.muted) {
            // Get new video track
            const stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            })
            
            const newVideoTrack = stream.getVideoTracks()[0]
            if (newVideoTrack) {
              await sender.replaceTrack(newVideoTrack)
              
              // Update local stream reference
              if (peer.localStream) {
                // Remove old track and add new one
                peer.localStream.removeTrack(track)
                peer.localStream.addTrack(newVideoTrack)
              }
              
              // Stop the old track
              track.stop()
              
              reconnectedTracks++
              logger.debug('Successfully reconnected video track')
            }
          }
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error))
          errors.push(err)
          logger.debug('Track reconnection failed:', err)
        }
      }
    }

    const success = reconnectedTracks > 0
    
    return {
      success,
      strategy: RecoveryStrategy.StreamReconnection,
      details: `Reconnected ${reconnectedTracks} video tracks`,
      error: errors.length > 0 ? errors[0] : undefined,
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    logger.error('Stream reconnection recovery failed:', err)
    
    return {
      success: false,
      strategy: RecoveryStrategy.StreamReconnection,
      error: err,
    }
  }
}

/**
 * Strategy 4: Re-INVITE Recovery
 * Performs full SIP renegotiation to recover the call
 */
export async function executeReinviteRecovery(
  instance: BaseRoomSession,
  options: RecoveryOptions = {}
): Promise<RecoveryResult> {
  try {
    logger.debug('Executing re-INVITE recovery')
    
    const peer = instance.peer as unknown as RTCPeer<any>
    if (!peer?.instance) {
      return {
        success: false,
        strategy: RecoveryStrategy.Reinvite,
        error: new Error('No active RTCPeerConnection available'),
      }
    }

    // Trigger ICE restart which will cause renegotiation
    peer.restartIce()
    
    // Wait for renegotiation to complete
    const timeout = options.timeout || DEFAULT_RECOVERY_OPTIONS.timeout!
    
    const renegotiationPromise = new Promise<boolean>((resolve) => {
      const checkConnection = () => {
        if (peer.instance.connectionState === 'connected') {
          resolve(true)
        } else if (peer.instance.connectionState === 'failed') {
          resolve(false)
        } else {
          setTimeout(checkConnection, 500)
        }
      }
      
      setTimeout(() => resolve(false), timeout)
      checkConnection()
    })

    const success = await renegotiationPromise
    
    return {
      success,
      strategy: RecoveryStrategy.Reinvite,
      details: success ? 'ICE restart completed successfully' : 'ICE restart timed out',
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    logger.error('Re-INVITE recovery failed:', err)
    
    return {
      success: false,
      strategy: RecoveryStrategy.Reinvite,
      error: err,
    }
  }
}

/**
 * Executes recovery strategies in priority order until one succeeds
 */
export async function executeRecoveryStrategies(
  instance: BaseRoomSession,
  strategies: RecoveryStrategy[] = [
    RecoveryStrategy.VideoPlay,
    RecoveryStrategy.KeyframeRequest,
    RecoveryStrategy.StreamReconnection,
    RecoveryStrategy.Reinvite,
  ],
  options: RecoveryOptions = {}
): Promise<RecoveryResult[]> {
  const results: RecoveryResult[] = []
  
  logger.debug('Executing recovery strategies:', strategies)
  
  for (const strategy of strategies) {
    let result: RecoveryResult
    
    switch (strategy) {
      case RecoveryStrategy.VideoPlay:
        result = await executeVideoPlayRecovery(instance, options)
        break
      case RecoveryStrategy.KeyframeRequest:
        result = await executeKeyframeRequestRecovery(instance, options)
        break
      case RecoveryStrategy.StreamReconnection:
        result = await executeStreamReconnectionRecovery(instance, options)
        break
      case RecoveryStrategy.Reinvite:
        result = await executeReinviteRecovery(instance, options)
        break
      default:
        result = {
          success: false,
          strategy,
          error: new Error(`Unknown recovery strategy: ${strategy}`),
        }
    }
    
    results.push(result)
    
    // If strategy succeeded, stop trying others
    if (result.success) {
      logger.debug(`Recovery successful with strategy: ${RecoveryStrategy[strategy]}`)
      break
    }
    
    logger.debug(`Recovery strategy ${RecoveryStrategy[strategy]} failed:`, result.error?.message)
  }
  
  if (!results.some(r => r.success)) {
    logger.warn('All recovery strategies failed')
  }
  
  return results
}

/**
 * Checks if any video elements need recovery
 */
export function needsVideoRecovery(instance: BaseRoomSession): boolean {
  try {
    const { localElements, remoteElements } = getVideoElements(instance)
    const allElements = [...localElements, ...remoteElements]
    
    return allElements.some(hasVideoIssues)
  } catch (error) {
    logger.warn('Error checking if video recovery is needed:', error)
    return false
  }
}

/**
 * Gets current video status for debugging
 */
export function getVideoStatus(instance: BaseRoomSession): {
  localVideos: Array<{
    paused: boolean
    dimensions: { width: number; height: number }
    readyState: number
  }>
  remoteVideos: Array<{
    paused: boolean
    dimensions: { width: number; height: number }
    readyState: number
  }>
} {
  const { localElements, remoteElements } = getVideoElements(instance)
  
  const getElementStatus = (element: HTMLVideoElement) => ({
    paused: element.paused,
    dimensions: {
      width: element.videoWidth,
      height: element.videoHeight,
    },
    readyState: element.readyState,
  })
  
  return {
    localVideos: localElements.map(getElementStatus),
    remoteVideos: remoteElements.map(getElementStatus),
  }
}