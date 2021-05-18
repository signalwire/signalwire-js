import { logger } from '@signalwire/core'
import * as WebRTC from './webrtcHelpers'

/**
 * Maps permission's names from `DevicePermissionDescriptor["name"]`
 * to `MediaDeviceKind`
 */
 const PERMISSIONS_MAPPING: Record<DevicePermissionName, MediaDeviceKind> = {
  camera: 'videoinput',
  microphone: 'audioinput',
  speaker: 'audiooutput',
}

const _getMediaDeviceKindByName = (name?: DevicePermissionName) => {
  if (!name) {
    return undefined
  }

  return PERMISSIONS_MAPPING[name]
}

/**
 * For browsers not supporting the Permissions API
 * @param {string} kind
 * @returns
 */
const _legacyCheckPermissions = async (kind?: MediaDeviceKind) => {
  const devices: MediaDeviceInfo[] = await WebRTC.enumerateDevicesByKind(kind)
  if (!devices.length) {
    logger.warn(`No ${kind} devices to check for permissions!`)
    return null
  }
  return devices.every(({ deviceId, label }) => Boolean(deviceId && label))
}

type DevicePermissionName = DevicePermissionDescriptor['name']

export const checkPermissions = async (name?: DevicePermissionName) => {
  if (
    'permissions' in navigator &&
    typeof navigator.permissions.query === 'function' &&
    name
  ) {
    return navigator.permissions.query({ name: name })
  }

  return _legacyCheckPermissions(_getMediaDeviceKindByName(name))
}

export const checkVideoPermissions = () => checkPermissions('camera')
export const checkAudioPermissions = () => checkPermissions('microphone')

const _constraintsByKind = (kind?: DevicePermissionName): MediaStreamConstraints => {
  return {
    audio: !kind || kind === "microphone" || kind === "speaker",
    video: !kind || kind === "camera",
  }
}

/**
 * Retrieve device list using the browser APIs
 * It checks for permission to return valid deviceId and label
 */
export const getDevicesWithPermissions = async (
  kind?: DevicePermissionName,
  fullList: boolean = false
): Promise<MediaDeviceInfo[]> => {
  const hasPerms = await checkPermissions(kind)
  if (hasPerms === false) {
    const constraints = _constraintsByKind(kind)
    const stream = await WebRTC.getUserMedia(constraints)
    WebRTC.stopStream(stream)
  }
  return getDevices(kind, fullList)
}

/**
 * Helper methods to get devices by kind
 */
export const getVideoDevicesWithPermissions = () =>
  getDevicesWithPermissions('camera')
export const getAudioInDevicesWithPermissions = () =>
  getDevicesWithPermissions('microphone')
export const getAudioOutDevicesWithPermissions = () =>
  getDevicesWithPermissions('speaker')

export const getDevices = async (
  name?: DevicePermissionName,
  fullList: boolean = false
): Promise<MediaDeviceInfo[]> => {
  const devices: MediaDeviceInfo[] = await WebRTC.enumerateDevicesByKind(_getMediaDeviceKindByName(name))
  if (fullList === true) {
    return devices
  }
  const found: string[] = []
  return devices.filter(({ deviceId, label, kind, groupId }) => {
    if (!deviceId || !label) {
      return false
    }
    if (!groupId) {
      return true
    }
    const key = `${kind}-${groupId}`
    if (!found.includes(key)) {
      found.push(key)
      return true
    }
    return false
  })
}

/**
 * Helper methods to get devices by kind
 */
export const getVideoDevices = () => getDevices("camera")
export const getAudioInDevices = () => getDevices("microphone")
export const getAudioOutDevices = () => getDevices("speaker")

/**
 * Scan a video deviceId by different resolutions
 */
const resolutionList = [
  [320, 240],
  [640, 360],
  [640, 480],
  [1280, 720],
  [1920, 1080],
]
export const scanResolutions = async (deviceId: string) => {
  const supported = []
  const stream = await WebRTC.getUserMedia({
    video: { deviceId: { exact: deviceId } },
  })
  const videoTrack = stream.getVideoTracks()[0]
  for (let i = 0; i < resolutionList.length; i++) {
    const [width, height] = resolutionList[i]
    const success = await videoTrack
      .applyConstraints({ width: { exact: width }, height: { exact: height } })
      .then(() => true)
      .catch(() => false)
    if (success) {
      supported.push({ resolution: `${width}x${height}`, width, height })
    }
  }
  WebRTC.stopStream(stream)

  return supported
}

/**
 * Assure a deviceId exists in the current device list from the browser.
 * It checks for deviceId or label - in case the UA changed the deviceId randomly
 */
export const assureDeviceId = async (
  id: string,
  label: string,
  name: DevicePermissionName
): Promise<string | null> => {
  const devices = await getDevices(name, true)
  for (let i = 0; i < devices.length; i++) {
    const { deviceId, label: deviceLabel } = devices[i]
    if (id === deviceId || label === deviceLabel) {
      return deviceId
    }
  }

  return null
}

/**
 * Helper methods to assure a deviceId without asking the user the "kind"
 */
export const validateVideoDevice = (id: string, label: string) =>
  assureDeviceId(id, label, "camera")
export const validateAudioInDevice = (id: string, label: string) =>
  assureDeviceId(id, label, "microphone")
export const validateAudioOutDevice = (id: string, label: string) =>
  assureDeviceId(id, label, "speaker")

export const checkDeviceIdConstraints = async (
  id: string,
  label: string,
  name: DevicePermissionName,
  constraints: MediaTrackConstraints
) => {
  const { deviceId = null } = constraints
  if (deviceId === null && (id || label)) {
    const deviceId = await assureDeviceId(id, label, name).catch(
      (_error) => null
    )
    if (deviceId) {
      constraints.deviceId = { exact: deviceId }
    }
  }
  return constraints
}

export const requestPermissions = async (
  constraints: MediaStreamConstraints
) => {
  try {
    const stream = await WebRTC.getUserMedia(constraints)
    WebRTC.stopStream(stream)
  } catch (error) {
    throw error
  }
}
