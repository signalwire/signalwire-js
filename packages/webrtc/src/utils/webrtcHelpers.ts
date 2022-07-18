import { getLogger } from '@signalwire/core'

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
  return typeof navigator?.mediaDevices?.getDisplayMedia === 'function'
}

export const getMediaDevicesApi = () => {
  if (!supportsMediaDevices()) {
    throw new Error("The media devices API isn't supported in this environment")
  }

  return navigator.mediaDevices
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
    getLogger().warn('No HTMLMediaElement to attach the speakerId')
    return
  } else if (typeof deviceId !== 'string') {
    getLogger().warn(`Invalid speaker deviceId: '${deviceId}'`)
    return
  } else if (!supportsMediaOutput()) {
    getLogger().warn('Browser does not support output device selection.')
    return
  }
  try {
    // @ts-ignore
    return await el.setSinkId(deviceId)
  } catch (error) {
    if (error.name === 'SecurityError') {
      getLogger().error(
        `You need to use HTTPS for selecting audio output device: ${error}`
      )
    } else {
      getLogger().error(`Error: ${error}`)
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
