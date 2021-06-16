import { logger, EventEmitter } from '@signalwire/core'
import StrictEventEmitter from 'strict-event-emitter-types'
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
    try {
      /**
       * `navigator.permissions.query` can throw if `name` is not a
       * valid enumation value for `PermissionName`. As of today, some
       * browsers like Fireforx will throw with `name: "camera"`
       */
      const status = await navigator.permissions.query({ name })

      return status.state === 'granted'
    } catch (e) {}
  }

  return _legacyCheckPermissions(_getMediaDeviceKindByName(name))
}

export const checkCameraPermissions = () => checkPermissions('camera')
export const checkMicrophonePermissions = () => checkPermissions('microphone')
export const checkSpeakerPermissions = () => checkPermissions('speaker')

const _constraintsByKind = (
  kind?: DevicePermissionName | 'all'
): MediaStreamConstraints => {
  return {
    audio:
      !kind || kind === 'all' || kind === 'microphone' || kind === 'speaker',
    video: !kind || kind === 'all' || kind === 'camera',
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
export const getCameraDevicesWithPermissions = () =>
  getDevicesWithPermissions('camera')
export const getMicrophoneDevicesWithPermissions = () =>
  getDevicesWithPermissions('microphone')
export const getSpeakerDevicesWithPermissions = () =>
  getDevicesWithPermissions('speaker')

const _filterDevices = (
  devices: MediaDeviceInfo[],
  options: { excludeDefault?: boolean; targets?: MediaDeviceKind[] } = {}
) => {
  const found: string[] = []
  return devices.filter(({ deviceId, label, kind, groupId }) => {
    if (
      !deviceId ||
      !label ||
      (options.targets && !options.targets?.includes(kind))
    ) {
      return false
    }
    if (!groupId) {
      return true
    }
    const key = `${kind}-${groupId}`
    const checkDefault = options?.excludeDefault ? deviceId !== 'default' : true
    if (!found.includes(key) && checkDefault) {
      found.push(key)
      return true
    }
    return false
  })
}

export const getDevices = async (
  name?: DevicePermissionName,
  fullList: boolean = false
): Promise<MediaDeviceInfo[]> => {
  const devices: MediaDeviceInfo[] = await WebRTC.enumerateDevicesByKind(
    _getMediaDeviceKindByName(name)
  )
  if (fullList === true) {
    return devices
  }

  return _filterDevices(devices)
}

/**
 * Helper methods to get devices by kind
 */
export const getCameraDevices = () => getDevices('camera')
export const getMicrophoneDevices = () => getDevices('microphone')
export const getSpeakerDevices = () => getDevices('speaker')

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
export const assureVideoDevice = (id: string, label: string) =>
  assureDeviceId(id, label, 'camera')
export const assureAudioInDevice = (id: string, label: string) =>
  assureDeviceId(id, label, 'microphone')
export const assureAudioOutDevice = (id: string, label: string) =>
  assureDeviceId(id, label, 'speaker')

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

const _deviceInfoToMap = (devices: MediaDeviceInfo[]) => {
  const map = new Map<string, MediaDeviceInfo>()

  devices.forEach((deviceInfo) => {
    if (deviceInfo.deviceId) {
      map.set(deviceInfo.deviceId, deviceInfo)
    }
  })

  return map
}

const _getDeviceListDiff = (
  oldDevices: MediaDeviceInfo[],
  newDevices: MediaDeviceInfo[]
) => {
  const current = _deviceInfoToMap(oldDevices)
  const removals = _deviceInfoToMap(oldDevices)
  const updates: MediaDeviceInfo[] = []

  logger.debug('[_getDeviceListDiff] <- oldDevices', oldDevices)
  logger.debug('[_getDeviceListDiff] -> newDevices', newDevices)

  const additions = newDevices.filter((newDevice) => {
    const id = newDevice.deviceId
    const oldDevice = current.get(id)

    if (oldDevice) {
      removals.delete(id)

      if (newDevice.label !== oldDevice.label) {
        updates.push(newDevice)
      }
    }

    return oldDevice === undefined
  })

  return {
    updated: updates.map((value) => {
      return {
        type: 'updated' as const,
        payload: value,
      }
    }),

    // Removed devices
    removed: Array.from(removals, ([_, value]) => value).map((value) => {
      return {
        type: 'removed' as const,
        payload: value,
      }
    }),

    added: additions.map((value) => {
      return {
        type: 'added' as const,
        payload: value,
      }
    }),
  }
}

const TARGET_PERMISSIONS_MAP: Record<
  DevicePermissionName,
  () => Promise<boolean | null>
> = {
  camera: checkCameraPermissions,
  microphone: checkMicrophonePermissions,
  speaker: checkSpeakerPermissions,
}

const DEFAULT_TARGETS: DevicePermissionName[] = [
  'camera',
  'microphone',
  'speaker',
]

type TargetPermission = Record<
  'supported' | 'unsupported',
  [Partial<DevicePermissionName>, boolean][]
>

const CHECK_SUPPORT_MAP: Partial<
  Record<DevicePermissionName, () => boolean>
> = {
  speaker: WebRTC.supportsMediaOutput,
}

const checkTargetPermissions = async (options: {
  targets?: DevicePermissionName[]
}): Promise<TargetPermission> => {
  const targets = options.targets ?? DEFAULT_TARGETS
  const permissions = await Promise.all(
    targets.map((target) => TARGET_PERMISSIONS_MAP[target]())
  )

  return permissions.reduce(
    (reducer, permission, index) => {
      const target = targets[index] as DevicePermissionName

      /**
       * If we don't specify a check for the target we'll assume
       * there's no need to check for support
       */
      const platformSupportStatus =
        target in CHECK_SUPPORT_MAP ? CHECK_SUPPORT_MAP[target]?.() : true

      const supportStatus: keyof TargetPermission = platformSupportStatus
        ? 'supported'
        : 'unsupported'

      reducer[supportStatus].push([target, !!permission])

      return reducer
    },
    { supported: [], unsupported: [] } as TargetPermission
  )
}

const validateTargets = async (options: {
  targets?: DevicePermissionName[]
}): Promise<DevicePermissionName[]> => {
  const targets = options.targets ?? DEFAULT_TARGETS
  const permissions = await checkTargetPermissions({ targets })

  if (
    permissions.unsupported.length > 0 &&
    targets.length === permissions.unsupported.length
  ) {
    throw new Error(
      `The platform doesn't support "${targets.join(
        ', '
      )}" as target/s, which means it's not possible to watch for changes on those devices.`
    )
  } else if (permissions.supported.every(([_, status]) => !status)) {
    throw new Error(
      'You must ask the user for permissions before being able to listen for device changes. Try calling getUserMedia() before calling `createDeviceWatcher()`.'
    )
  }

  let needPermissionsTarget: DevicePermissionName[] = []
  const filteredTargets: DevicePermissionName[] = permissions.supported.reduce(
    (reducer, [target, status]) => {
      if (!status) {
        needPermissionsTarget.push(target)
      } else {
        reducer.push(target)
      }

      return reducer
    },
    [] as DevicePermissionName[]
  )

  /**
   * If the length of these two arrays is different it means whether
   * we have unsupported devices or that the user hasn't granted the
   * permissions for certain targets
   */
  if (filteredTargets.length !== targets.length) {
    const unsupportedTargets =
      permissions.unsupported.length > 0
        ? `The platform doesn't support "${permissions.unsupported
            .map(([t]) => t)
            .join(
              ', '
            )}" as target/s, which means it's not possible to watch for changes on those devices. `
        : ''

    const needPermissions =
      needPermissionsTarget.length > 0
        ? `The user hasn't granted permissions for the following targets: ${needPermissionsTarget.join(
            ', '
          )}. `
        : ''

    logger.warn(
      `${unsupportedTargets}${needPermissions}We'll be watching for the following targets instead: "${filteredTargets.join(
        ', '
      )}"`
    )
  }

  return filteredTargets
}

interface CreateDeviceWatcherOptions {
  targets?: DevicePermissionName[]
}

// prettier-ignore
type DeviceWatcherEventNames =
  | 'added'
  | 'changed'
  | 'removed'
  | 'updated'

type DeviceWatcherChangePayload<T extends DeviceWatcherEventNames> = {
  type: T
  payload: MediaDeviceInfo
}

type DeviceWatcherChange<T extends DeviceWatcherEventNames> = {
  changes: DeviceWatcherChangePayload<T>[]
  devices: MediaDeviceInfo[]
}

interface DeviceWatcherEvents {
  added: DeviceWatcherChange<'added'>
  removed: DeviceWatcherChange<'removed'>
  updated: DeviceWatcherChange<'updated'>
  changed: {
    changes: {
      added: DeviceWatcherChangePayload<'added'>[]
      removed: DeviceWatcherChangePayload<'removed'>[]
      updated: DeviceWatcherChangePayload<'updated'>[]
    }
    devices: MediaDeviceInfo[]
  }
}

export const createDeviceWatcher = async (
  options: CreateDeviceWatcherOptions = {}
) => {
  const targets = await validateTargets({ targets: options.targets })
  const emitter: StrictEventEmitter<
    EventEmitter,
    DeviceWatcherEvents
  > = new EventEmitter()
  const currentDevices = await WebRTC.enumerateDevices()
  const kinds = targets?.reduce((reducer, name) => {
    const kind = _getMediaDeviceKindByName(name)

    if (kind) {
      reducer.push(kind)
    }

    return reducer
  }, [] as MediaDeviceKind[])

  let knownDevices = _filterDevices(currentDevices, {
    excludeDefault: true,
    targets: kinds,
  })

  WebRTC.getMediaDevicesApi().ondevicechange = async () => {
    const currentDevices = await WebRTC.enumerateDevices()
    const oldDevices = knownDevices
    const newDevices = _filterDevices(currentDevices, {
      excludeDefault: true,
      targets: kinds,
    })

    knownDevices = newDevices

    const changes = _getDeviceListDiff(oldDevices, newDevices)
    const hasAddedDevices = changes.added.length > 0
    const hasRemovedDevices = changes.removed.length > 0
    const hasUpdatedDevices = changes.updated.length > 0

    if (hasAddedDevices || hasRemovedDevices || hasUpdatedDevices) {
      emitter.emit('changed', { changes: changes, devices: newDevices })
    }

    if (hasAddedDevices) {
      emitter.emit('added', {
        changes: changes.added,
        devices: newDevices,
      })
    }
    if (hasRemovedDevices) {
      emitter.emit('removed', {
        changes: changes.removed,
        devices: newDevices,
      })
    }
    if (hasUpdatedDevices) {
      emitter.emit('updated', {
        changes: changes.updated,
        devices: newDevices,
      })
    }
  }

  return emitter
}

export const createMicrophoneDeviceWatcher = () =>
  createDeviceWatcher({ targets: ['microphone'] })
export const createSpeakerDeviceWatcher = () =>
  createDeviceWatcher({ targets: ['speaker'] })
export const createCameraDeviceWatcher = () =>
  createDeviceWatcher({ targets: ['camera'] })
