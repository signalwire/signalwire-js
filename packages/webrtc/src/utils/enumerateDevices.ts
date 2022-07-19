import { getMediaDevicesApi } from './primitives'

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
