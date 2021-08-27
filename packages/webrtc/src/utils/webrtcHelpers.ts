import { logger } from '@signalwire/core'

export const RTCPeerConnection = (config: RTCConfiguration) => {
  return new window.RTCPeerConnection(config)
}

/**
 * Returns whether the current environment supports the media devices API.
 */
export const supportsMediaDevices = () => {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices
}

/**
 * Returns whether the current environment supports `getUserMedia`.
 */
export const supportsGetUserMedia = () => {
  return typeof navigator?.mediaDevices?.getUserMedia === 'function'
}

/**
 * Returns whether the current environment supports `getDisplayMedia`.
 */
export const supportsGetDisplayMedia = () => {
  // @ts-expect-error
  return typeof navigator?.mediaDevices?.getDisplayMedia === 'function'
}

export const getMediaDevicesApi = () => {
  if (!supportsMediaDevices()) {
    throw new Error("The media devices API isn't supported in this environment")
  }

  return navigator.mediaDevices
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
export const getUserMedia = (
  constraints: MediaStreamConstraints = { audio: true, video: true }
) => {
  try {
    return getMediaDevicesApi().getUserMedia(constraints)
  } catch (error) {
    switch (error.name) {
      case 'Error': {
        logger.error(
          "navigator.mediaDevices.getUserMedia doesn't seem to be supported."
        )
        break
      }
      case 'NotFoundError': {
        logger.error(
          'No media tracks of the type specified were found that satisfy the given constraints.'
        )
        break
      }
      case 'NotReadableError': {
        logger.error(
          'Hardware error occurred at the operating system, browser, or Web page level which prevented access to the device. This could have been caused by having the Camera or Mic being user by another application.'
        )
        break
      }
      case 'OverconstrainedError': {
        logger.error(
          `The constraint: ${error.constraint} cannot be met by the selected device.`
        )
        logger.info(`List of available constraints:`, getSupportedConstraints())
        break
      }
      case 'NotAllowedError': {
        logger.error(
          'The user has mostly likely denied access to the device. This could also happen if the browsing context is insecure (using HTTP rather than HTTPS)'
        )
        break
      }
      case 'TypeError': {
        if (Object.keys(constraints).length === 0) {
          logger.error(
            'Constraints can\'t be empty nor have "video" and "audio" set to false.'
          )
        } else {
          logger.error(
            'Please check that you are calling this method from a secure context (using HTTPS rather than HTTP).'
          )
        }

        break
      }
      case 'SecurityError': {
        logger.error(
          'User media support is disabled on the Document on which getUserMedia() was called. The mechanism by which user media support is enabled and disabled is left up to the individual user agent.'
        )
        break
      }
    }

    throw error
  }
}

/**
 * Prompts the user to share the screen and asynchronously returns a
 * [MediaStream](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream)
 * object associated with a display or part of it.
 *
 * @param constraints an optional
 * [MediaStreamConstraints](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamConstraints)
 * object specifying requirements for the returned [MediaStream](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream).
 *
 * @example
 *  ```typescript
 * await SignalWire.WebRTC.getDisplayMedia()
 * // MediaStream {id: "HCXy...", active: true, ...}
 * ```
 */
export const getDisplayMedia = (constraints: MediaStreamConstraints) => {
  // @ts-expect-error
  return getMediaDevicesApi().getDisplayMedia(constraints)
}

/**
 * Enumerates the media input and output devices available on this device.
 *
 * > 📘
 * > Depending on the browser, some information (such as the `label` and
 * > `deviceId` attributes) could be hidden until permission is granted, for
 * > example by calling {@link getUserMedia}.
 *
 * @example
 * ```typescript
 * await SignalWire.WebRTC.enumerateDevices()
 * // [
 * //   {
 * //     "deviceId": "Rug5Bk...4TMhY=",
 * //     "kind": "videoinput",
 * //     "label": "HD FaceTime Camera",
 * //     "groupId": "EEX/N2...AjrOs="
 * //   },
 * //   ...
 * // ]
 * ```
 */
export const enumerateDevices = () => {
  return getMediaDevicesApi().enumerateDevices()
}

export const enumerateDevicesByKind = async (
  filterByKind?: MediaDeviceKind
) => {
  let devices: MediaDeviceInfo[] = await enumerateDevices().catch(
    (_error) => []
  )
  if (filterByKind) {
    devices = devices.filter(({ kind }) => kind === filterByKind)
  }
  return devices
}

/**
 * Returns a dictionary whose fields specify the constrainable properties the user agent understands.
 *
 * @example
 * ```typescript
 * SignalWire.WebRTC.getSupportedConstraints()
 * // {
 * //   "aspectRatio": true,
 * //   "autoGainControl": true,
 * //   "brightness": true,
 * //   "channelCount": true,
 * //   "colorTemperature": true,
 * //   ...
 * // }
 * ```
 */
export const getSupportedConstraints = () => {
  return getMediaDevicesApi().getSupportedConstraints()
}

export const streamIsValid = (stream?: MediaStream) =>
  stream && stream instanceof MediaStream

/**
 * Returns whether the current environment supports the selection of a media output device.
 */
export const supportsMediaOutput = () => {
  return 'sinkId' in HTMLMediaElement.prototype
}

/**
 * Assigns the specified audio output device to the specified HTMLMediaElement.
 * The device with id `deviceId` must be an audio output device. Asynchronously
 * returns whether the operation had success.
 *
 * > 📘
 * > Some browsers do not support output device selection. You can check by
 * > calling [`supportsMediaOutput`](supportsmediaoutput).
 *
 * @param el target element
 * @param deviceId id of the audio output device
 * @returns a promise of whether the operation had success
 *
 * @example
 * ```typescript
 * const el = document.querySelector('video')
 * const outDevices = await SignalWire.WebRTC.getSpeakerDevicesWithPermissions()
 * await SignalWire.WebRTC.setMediaElementSinkId(el, outDevices[0].deviceId)
 * // true
```
 */
export const setMediaElementSinkId = async (
  el: HTMLMediaElement | null,
  deviceId: string
): Promise<undefined> => {
  if (el === null) {
    logger.warn('No HTMLMediaElement to attach the speakerId')
    return
  } else if (typeof deviceId !== 'string') {
    logger.warn(`Invalid speaker deviceId: '${deviceId}'`)
    return
  } else if (!supportsMediaOutput()) {
    logger.warn('Browser does not support output device selection.')
    return
  }
  try {
    // @ts-ignore
    return await el.setSinkId(deviceId)
  } catch (error) {
    if (error.name === 'SecurityError') {
      logger.error(
        `You need to use HTTPS for selecting audio output device: ${error}`
      )
    } else {
      logger.error(`Error: ${error}`)
    }

    throw error
  }
}

export const sdpToJsonHack = (sdp: any) => sdp

export const stopStream = (stream?: MediaStream) => {
  if (streamIsValid(stream)) {
    stream?.getTracks()?.forEach(stopTrack)
  }
}

export const stopTrack = (track: MediaStreamTrack) => {
  if (track && track.readyState === 'live') {
    track.stop()
    track.dispatchEvent(new Event('ended'))
  }
}
