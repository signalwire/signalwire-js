import { logger } from '@signalwire/core'

export const RTCPeerConnection = (config: RTCConfiguration) => {
  return new window.RTCPeerConnection(config)
}

export const supportsMediaDevices = () => {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices
}

export const supportsGetUserMedia = () => {
  return typeof navigator?.mediaDevices?.getUserMedia === 'function'
}

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

export const getDisplayMedia = (constraints: MediaStreamConstraints) => {
  // @ts-expect-error
  return getMediaDevicesApi().getDisplayMedia(constraints)
}

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

export const getSupportedConstraints = () => {
  return getMediaDevicesApi().getSupportedConstraints()
}

export const streamIsValid = (stream?: MediaStream) =>
  stream && stream instanceof MediaStream

export const supportsMediaOutput = () => {
  return 'sinkId' in HTMLMediaElement.prototype
}

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
