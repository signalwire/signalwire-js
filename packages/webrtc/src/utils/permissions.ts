import { getLogger } from '@signalwire/core'
import { _getMediaDeviceKindByName } from './primitives'
import { enumerateDevicesByKind } from './enumerateDevices'

/**
 * For browsers not supporting the Permissions API
 * @param {string} kind
 * @returns
 */
const _legacyCheckPermissions = async (kind?: MediaDeviceKind) => {
  const devices: MediaDeviceInfo[] = await enumerateDevicesByKind(kind)
  if (!devices.length) {
    getLogger().warn(`No ${kind} devices to check for permissions!`)
    return null
  }
  return devices.every(({ deviceId, label }) => Boolean(deviceId && label))
}

// DevicePermissionDescriptor['name]
type DevicePermissionName = 'camera' | 'microphone' | 'speaker'

/**
 * Asynchronously returns whether we have permissions to access the specified
 * resource. Some common parameter values for `name` are `"camera"`,
 * `"microphone"`, and `"speaker"`. In those cases, prefer the dedicated methods
 * {@link checkCameraPermissions}, {@link checkMicrophonePermissions}, and
 * {@link checkSpeakerPermissions}.
 * @param name name of the resource
 *
 * @example
 * ```typescript
 * await SignalWire.WebRTC.checkPermissions("camera")
 * // true: we have permission for using the camera
 * ```
 */
export const checkPermissions = async (name?: DevicePermissionName) => {
  if (
    'permissions' in navigator &&
    typeof navigator.permissions.query === 'function' &&
    name
  ) {
    try {
      /**
       * `navigator.permissions.query` can throw if `name` is not a
       * valid enumation value for `PermissionName`. As of today, some
       * browsers like Fireforx will throw with `name: "camera"`
       */
      // @ts-expect-error
      const status = await navigator.permissions.query({ name })

      return status.state === 'granted'
    } catch (e) {}
  }

  return _legacyCheckPermissions(_getMediaDeviceKindByName(name))
}

/**
 * Asynchronously returns whether we have permissions to access the camera.
 *
 * @example
 * ```typescript
 * await SignalWire.WebRTC.checkCameraPermissions()
 * // true
 * ```
 */
export const checkCameraPermissions = () => checkPermissions('camera')

/**
 * Asynchronously returns whether we have permissions to access the microphone.
 *
 * @example
 * ```typescript
 * await SignalWire.WebRTC.checkMicrophonePermissions()
 * // true
 * ```
 */
export const checkMicrophonePermissions = () => checkPermissions('microphone')

/**
 * Asynchronously returns whether we have permissions to access the speakers.
 *
 * @example
 * ```typescript
 * await SignalWire.WebRTC.checkSpeakerPermissions()
 * // true
 * ```
 */
export const checkSpeakerPermissions = () => checkPermissions('speaker')
