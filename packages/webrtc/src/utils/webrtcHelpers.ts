import { logger } from '@signalwire/core'

export const RTCPeerConnection = (config: RTCConfiguration) => {
  return new window.RTCPeerConnection(config)
}

export const getUserMedia = (constraints: MediaStreamConstraints) => {
  return navigator.mediaDevices.getUserMedia(constraints)
}

export const getDisplayMedia = (constraints: MediaStreamConstraints) => {
  // @ts-ignore
  return navigator.mediaDevices.getDisplayMedia(constraints)
}

export const enumerateDevices = () => navigator.mediaDevices.enumerateDevices()

export const enumerateDevicesByKind = async (filterByKind: string) => {
  let devices: MediaDeviceInfo[] = await enumerateDevices().catch(
    (_error) => []
  )
  if (filterByKind) {
    devices = devices.filter(({ kind }) => kind === filterByKind)
  }
  return devices
}

export const getSupportedConstraints = () => {
  return navigator.mediaDevices.getSupportedConstraints()
}

export const streamIsValid = (stream?: MediaStream) =>
  stream && stream instanceof MediaStream

export const attachMediaStream = (tag: any, stream: MediaStream) => {
  const element = findElementByType(tag)
  if (element === null) {
    return
  }
  if (!element.getAttribute('autoplay')) {
    element.setAttribute('autoplay', 'autoplay')
  }
  if (!element.getAttribute('playsinline')) {
    element.setAttribute('playsinline', 'playsinline')
  }
  element.srcObject = stream
}

export const detachMediaStream = (tag: any) => {
  const element = findElementByType(tag)
  if (element) {
    element.srcObject = null
  }
}

export const findElementByType = (
  tag: HTMLMediaElement | string | Function
): HTMLMediaElement | null => {
  if (typeof document !== 'object' || !('getElementById' in document)) {
    return null
  }
  if (typeof tag === 'string') {
    return <HTMLMediaElement>document.getElementById(tag) || null
  } else if (typeof tag === 'function') {
    return tag()
  } else if (tag instanceof HTMLMediaElement) {
    return tag
  }
  return null
}

export const muteMediaElement = (tag: any) => {
  const element = findElementByType(tag)
  if (element) {
    element.muted = true
  }
}

export const unmuteMediaElement = (tag: any) => {
  const element = findElementByType(tag)
  if (element) {
    element.muted = false
  }
}

export const toggleMuteMediaElement = (tag: any) => {
  const element = findElementByType(tag)
  if (element) {
    element.muted = !element.muted
  }
}

export const setMediaElementSinkId = async (
  tag: any,
  deviceId: string
): Promise<boolean> => {
  const element = findElementByType(tag)
  if (element === null) {
    logger.info('No HTMLMediaElement to attach the speakerId')
    return false
  }
  if (typeof deviceId !== 'string') {
    logger.info(`Invalid speaker deviceId: '${deviceId}'`)
    return false
  }
  try {
    // @ts-ignore
    await element.setSinkId(deviceId)
    return true
  } catch (error) {
    return false
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

export const getHostname = () => window.location.hostname

export const buildVideoElementByTrack = (
  videoTrack: MediaStreamTrack,
  streamIds: string[] = []
) => {
  const video = document.createElement('video')
  video.muted = true
  video.autoplay = true
  // @ts-ignore
  video.playsinline = true
  // @ts-ignore
  video._streamIds = streamIds

  const mediaStream = new MediaStream([videoTrack])
  video.srcObject = mediaStream

  const onCanPlay = () => console.debug('video can play!')
  const onPlay = () => console.debug('video is now playing...')
  video.addEventListener('play', onPlay)
  video.addEventListener('canplay', onCanPlay)
  videoTrack.addEventListener('ended', () => {
    video.removeEventListener('play', onPlay)
    video.removeEventListener('canplay', onCanPlay)
    video.srcObject = null
    // @ts-ignore
    delete video._streamIds
    video.remove()
  })
  return video
}

export const buildAudioElementByTrack = (
  audioTrack: MediaStreamTrack,
  streamIds: string[] = []
) => {
  const audio = new Audio()
  audio.autoplay = true
  // @ts-ignore
  audio.playsinline = true
  // @ts-ignore
  audio._streamIds = streamIds

  const mediaStream = new MediaStream([audioTrack])
  audio.srcObject = mediaStream

  const onCanPlay = () => console.debug('audio can play!')
  const onPlay = () => console.debug('audio is now playing...')
  audio.addEventListener('play', onPlay)
  audio.addEventListener('canplay', onCanPlay)
  audioTrack.addEventListener('ended', () => {
    audio.removeEventListener('play', onPlay)
    audio.removeEventListener('canplay', onCanPlay)
    audio.srcObject = null
    // @ts-ignore
    delete audio._streamIds
    audio.remove()
  })

  return audio
}
