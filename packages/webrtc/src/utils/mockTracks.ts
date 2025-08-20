/**
 * Mock track utilities for pre-warming RTCPeerConnections
 * These tracks are used to trigger ICE gathering without real media
 */

/**
 * Creates a mock audio track using Web Audio API
 * @returns A MediaStreamTrack that produces silence
 */
export function createMockAudioTrack(): MediaStreamTrack {
  // @ts-ignore - webkitAudioContext for older browsers
  const AudioContext = window.AudioContext || window.webkitAudioContext
  const ctx = new AudioContext()

  // Create silent audio source
  const oscillator = ctx.createOscillator()
  const dst = ctx.createMediaStreamDestination()

  // Set frequency to 0 for silence
  oscillator.frequency.value = 0
  oscillator.connect(dst)
  oscillator.start()

  const track = dst.stream.getAudioTracks()[0]

  // Store references for cleanup
  // @ts-ignore - store for cleanup
  track._mockContext = ctx
  // @ts-ignore - store for cleanup
  track._mockOscillator = oscillator

  return track
}

/**
 * Creates a mock video track using canvas
 * Falls back to null on Safari which doesn't support captureStream
 * @returns A MediaStreamTrack or null if not supported
 */
export function createMockVideoTrack(): MediaStreamTrack | null {
  // Check for browser support
  const canvas = document.createElement('canvas')

  if (!canvas.captureStream) {
    console.warn('canvas.captureStream not supported, using audio-only mock')
    return null
  }

  // Set minimal dimensions to reduce resource usage
  canvas.width = 320
  canvas.height = 240

  // Draw a single black frame
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  // Capture at 1 fps to minimize resource usage
  const stream = canvas.captureStream(1)
  const track = stream.getVideoTracks()[0]

  // Store canvas reference for cleanup
  // @ts-ignore - store for cleanup
  track._mockCanvas = canvas

  return track
}

/**
 * Properly stops and cleans up a mock audio track
 * @param track The mock audio track to clean up
 */
export function cleanupMockAudioTrack(track: MediaStreamTrack): void {
  if (track.readyState === 'live') {
    track.stop()
  }

  // Clean up Web Audio resources
  // @ts-ignore
  if (track._mockOscillator) {
    // @ts-ignore
    track._mockOscillator.stop()
    // @ts-ignore
    track._mockOscillator.disconnect()
    // @ts-ignore
    delete track._mockOscillator
  }

  // @ts-ignore
  if (track._mockContext) {
    // @ts-ignore
    track._mockContext.close()
    // @ts-ignore
    delete track._mockContext
  }
}

/**
 * Properly stops and cleans up a mock video track
 * @param track The mock video track to clean up
 */
export function cleanupMockVideoTrack(track: MediaStreamTrack | null): void {
  if (!track) return

  if (track.readyState === 'live') {
    track.stop()
  }

  // Clean up canvas
  // @ts-ignore
  if (track._mockCanvas) {
    // @ts-ignore
    track._mockCanvas.remove()
    // @ts-ignore
    delete track._mockCanvas
  }
}
