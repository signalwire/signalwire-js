import { _getMediaDeviceKindByName, stopStream } from './primitives'
import { getUserMedia } from './getUserMedia'

/**
 * Prompts the user to grant permissions for the devices matching the specified set of constraints.
 * @param constraints an optional [MediaStreamConstraints](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamConstraints)
 *                    object specifying requirements for the returned [MediaStream](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream).
 *
 * @example
 * To only request audio permissions:
 *
 * ```typescript
 * await SignalWire.WebRTC.requestPermissions({audio: true, video: false})
 * ```
 *
 * @example
 * To request permissions for both audio and video, specifying constraints for the video:
 * ```typescript
 * const constraints = {
 *   audio: true,
 *   video: {
 *     width: { min: 1024, ideal: 1280, max: 1920 },
 *     height: { min: 576, ideal: 720, max: 1080 }
 *   }
 * }
 * await SignalWire.WebRTC.requestPermissions(constraints)
 * ```
 */
export const requestPermissions = async (
  constraints: MediaStreamConstraints
) => {
  try {
    const stream = await getUserMedia(constraints)
    stopStream(stream)
  } catch (error) {
    throw error
  }
}
