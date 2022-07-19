import { getLogger, timeoutPromise } from '@signalwire/core'
import { getMediaDevicesApi, getSupportedConstraints } from './primitives'
import {
  checkMicrophonePermissions,
  checkCameraPermissions,
} from './permissions'

const GUM_TIMEOUT = 5_000

/**
 * Check if we need to set a timeout on the gUM request.
 * In case the user needs to go through the browser prompt
 * for permissions we can't set a timer but instead just wait for
 * the user and/or the UA to solve the promise.
 * If we have the permissions already, set the timeout because we
 * had some cases where the UA is stuck reading from the device
 * and the gUM request was never resolved.
 *
 * @internal
 * @returns True/False whether the timeout should be used
 */
const _useTimeoutForGUM = async (constraints: MediaStreamConstraints) => {
  const promises = []
  if (constraints?.audio) {
    promises.push(checkMicrophonePermissions())
  }
  if (constraints?.video) {
    promises.push(checkCameraPermissions())
  }
  if (promises.length) {
    const results = await Promise.all(promises)
    return results.every(Boolean)
  }
  return false
}

/**
 * Prompts the user to share one or more media devices and asynchronously
 * returns an associated [MediaStream](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream)
 * object.
 *
 * For more information, see [`MediaDevices.getUserMedia()`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).
 *
 * @param constraints an optional [MediaStreamConstraints](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamConstraints)
 *                    object specifying requirements for the returned [MediaStream](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream).
 *
 * @example
 * To only request audio media:
 *
 * ```typescript
 * await SignalWire.WebRTC.getUserMedia({audio: true, video: false})
 * // MediaStream {id: "HCXy...", active: true, ...}
 * ```
 *
 * @example
 * To request both audio and video, specifying constraints for the video:
 *
 * ```typescript
 * const constraints = {
 *   audio: true,
 *   video: {
 *     width: { min: 1024, ideal: 1280, max: 1920 },
 *     height: { min: 576, ideal: 720, max: 1080 }
 *   }
 * }
 * await SignalWire.WebRTC.getUserMedia(constraints)
 * // MediaStream {id: "EDVk...", active: true, ...}
 * ```
 */
export const getUserMedia = async (
  constraints: MediaStreamConstraints = { audio: true, video: true }
) => {
  try {
    const promise = getMediaDevicesApi().getUserMedia(constraints)
    const useTimeout = await _useTimeoutForGUM(constraints)
    if (useTimeout) {
      const exception = new Error('Timeout reading from your devices')
      return await timeoutPromise<MediaStream>(promise, GUM_TIMEOUT, exception)
    }

    return await promise
  } catch (error) {
    switch (error.name) {
      case 'Error': {
        getLogger().error(
          error?.message ??
            "navigator.mediaDevices.getUserMedia doesn't seem to be supported."
        )
        break
      }
      case 'NotFoundError': {
        getLogger().error(
          'No media tracks of the type specified were found that satisfy the given constraints.'
        )
        break
      }
      case 'NotReadableError': {
        getLogger().error(
          'Hardware error occurred at the operating system, browser, or Web page level which prevented access to the device. This could have been caused by having the Camera or Mic being user by another application.'
        )
        break
      }
      case 'OverconstrainedError': {
        getLogger().error(
          `The constraint: ${error.constraint} cannot be met by the selected device.`
        )
        getLogger().info(
          `List of available constraints:`,
          getSupportedConstraints()
        )
        break
      }
      case 'NotAllowedError': {
        getLogger().error(
          'The user has mostly likely denied access to the device. This could also happen if the browsing context is insecure (using HTTP rather than HTTPS)'
        )
        break
      }
      case 'TypeError': {
        if (Object.keys(constraints).length === 0) {
          getLogger().error(
            'Constraints can\'t be empty nor have "video" and "audio" set to false.'
          )
        } else {
          getLogger().error(
            'Please check that you are calling this method from a secure context (using HTTPS rather than HTTP).'
          )
        }

        break
      }
      case 'SecurityError': {
        getLogger().error(
          'User media support is disabled on the Document on which getUserMedia() was called. The mechanism by which user media support is enabled and disabled is left up to the individual user agent.'
        )
        break
      }
    }

    throw error
  }
}
