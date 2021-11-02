import { logger, EventEmitter } from '@signalwire/core'
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
 * After prompting the user for permission, returns an array of media input and
 * output devices available on this machine. If `kind` is not null, only the
 * devices of the specified kind are returned. Possible values of the `kind`
 * parameters are `"camera"`, `"microphone"`, and `"speaker"`, which
 * respectively correspond to functions
 * {@link getCameraDevicesWithPermissions},
 * {@link getMicrophoneDevicesWithPermissions}, and
 * {@link getSpeakerDevicesWithPermissions}.
 *
 * @param kind filter for this device category
 * @param fullList By default, only devices for which
 * we have been granted permissions are returned. To obtain a list of devices regardless of
 * the permissions, pass `fullList=true`. Note however that some values such as
 * `name` and `deviceId` could be omitted.
 *
 * @example
 * ```typescript
 * await SignalWire.WebRTC.getDevicesWithPermissions("camera")
 * // [
 * //   {
 * //     "deviceId": "Rug5Bk...4TMhY=",
 * //     "kind": "videoinput",
 * //     "label": "HD FaceTime Camera",
 * //     "groupId": "Su/dzw...ccfnY="
 * //   }
 * // ]
 * ```
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
 * After prompting the user for permission, returns an array of camera devices.
 *
 * @example
 * ```typescript
 * await SignalWire.WebRTC.getCameraDevicesWithPermissions()
 * // [
 * //   {
 * //     "deviceId": "Rug5Bk...4TMhY=",
 * //     "kind": "videoinput",
 * //     "label": "HD FaceTime Camera",
 * //     "groupId": "Su/dzw...ccfnY="
 * //   }
 * // ]
 * ```
 */
export const getCameraDevicesWithPermissions = () =>
  getDevicesWithPermissions('camera')

/**
 * After prompting the user for permission, returns an array of microphone devices.
 *
 * @example
 * ```typescript
 * await SignalWire.WebRTC.getMicrophoneDevicesWithPermissions()
 * // [
 * //   {
 * //     "deviceId": "ADciLf...NYgF8=",
 * //     "kind": "audioinput",
 * //     "label": "Internal Microphone",
 * //     "groupId": "rgZgKM...NW1hU="
 * //   }
 * // ]
 * ```
 */
export const getMicrophoneDevicesWithPermissions = () =>
  getDevicesWithPermissions('microphone')

/**
 * After prompting the user for permission, returns an array of speaker devices.
 *
 * @example
 * ```typescript
 * await SignalWire.WebRTC.getSpeakerDevicesWithPermissions()
 * // [
 * //   {
 * //     "deviceId": "ADciLf...NYgF8=",
 * //     "kind": "audiooutput",
 * //     "label": "External Speaker",
 * //     "groupId": "rgZgKM...NW1hU="
 * //   }
 * // ]
 * ```
 */
export const getSpeakerDevicesWithPermissions = () =>
  getDevicesWithPermissions('speaker')

const _filterDevices = (
  devices: MediaDeviceInfo[],
  options: { excludeDefault?: boolean; targets?: MediaDeviceKind[] } = {}
) => {
  const found: string[] = []
  return devices.filter(({ deviceId, kind, groupId }) => {
    if (!deviceId || (options.targets && !options.targets?.includes(kind))) {
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

/**
 * Enumerates the media input and output devices available on this machine. If
 * `name` is not null, only the devices of the specified kind are returned.
 * Possible values of the `name` parameters are `"camera"`, `"microphone"`, and
 * `"speaker"`, which respectively correspond to functions
 * {@link getCameraDevices}, {@link getMicrophoneDevices}, and
 * {@link getSpeakerDevices}.
 *
 * @param name filter for this device category
 * @param fullList By default, only devices for which
 * we have permissions are returned. To obtain a list of devices regardless of
 * the permissions, pass `fullList=true`. Note however that some values such as
 * `name` and `deviceId` could be omitted.
 *
 * @example
 * ```typescript
 * await SignalWire.WebRTC.getDevices("camera", true)
 * // [
 * //   {
 * //     "deviceId": "",
 * //     "kind": "videoinput",
 * //     "label": "",
 * //     "groupId": "3c4f97...828fec"
 * //   }
 * // ]
 * ```
 * In this case, `deviceId` and `label` are omitted because we lack permissions.
 * Without `fullList=true`, this device would not have been returned.
 */
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
 * Returns an array of camera devices that can be accessed on this device (for which we have permissions).
 *
 * @example
 * ```typescript
 * await SignalWire.WebRTC.getCameraDevices()
 * // [
 * //   {
 * //     "deviceId": "Rug5Bk...4TMhY=",
 * //     "kind": "videoinput",
 * //     "label": "HD FaceTime Camera",
 * //     "groupId": "Su/dzw...ccfnY="
 * //   }
 * // ]
 * ```
 */
export const getCameraDevices = () => getDevices('camera')

/**
 * Returns an array of microphone devices that can be accessed on this device (for which we have permissions).
 *
 * @example
 * ```typescript
 * await SignalWire.WebRTC.getMicrophoneDevices()
 * // [
 * //   {
 * //     "deviceId": "ADciLf...NYgF8=",
 * //     "kind": "audioinput",
 * //     "label": "Internal Microphone",
 * //     "groupId": "rgZgKM...NW1hU="
 * //   }
 * // ]
 * ```
 */
export const getMicrophoneDevices = () => getDevices('microphone')

/**
 * Returns an array of speaker devices that can be accessed on this device (for which we have permissions).
 *
 * @example
 * ```typescript
 * await SignalWire.WebRTC.getSpeakerDevices()
 * // [
 * //   {
 * //     "deviceId": "ADciLf...NYgF8=",
 * //     "kind": "audiooutput",
 * //     "label": "External Speaker",
 * //     "groupId": "rgZgKM...NW1hU="
 * //   }
 * // ]
 * ```
 */
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
const ALLOWED_TARGETS_MSG = `Allowed targets are: '${DEFAULT_TARGETS.join(
  "', '"
)}'`

type TargetPermission = Record<
  'supported' | 'unsupported',
  [Partial<DevicePermissionName>, boolean][]
>

const CHECK_SUPPORT_MAP: Partial<Record<DevicePermissionName, () => boolean>> =
  {
    speaker: WebRTC.supportsMediaOutput,
  }

const checkTargetPermissions = async (options: {
  targets: DevicePermissionName[]
}): Promise<TargetPermission> => {
  const targets = options.targets
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
  const targets = (options.targets ?? DEFAULT_TARGETS).filter((target) => {
    if (!DEFAULT_TARGETS.includes(target)) {
      logger.warn(
        `We'll ignore the "${target}" target as it is not allowed. ${ALLOWED_TARGETS_MSG}.`
      )
      return false
    }
    return true
  })
  if (!targets.length) {
    throw new Error(
      `At least one "target" is required for createDeviceWatcher(). ${ALLOWED_TARGETS_MSG}.`
    )
  }
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

  logger.debug(`Watching these targets: "${filteredTargets.join(', ')}"`)
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
  added: (params: DeviceWatcherChange<'added'>) => void
  removed: (params: DeviceWatcherChange<'removed'>) => void
  updated: (params: DeviceWatcherChange<'updated'>) => void
  changed: (params: {
    changes: {
      added: DeviceWatcherChangePayload<'added'>[]
      removed: DeviceWatcherChangePayload<'removed'>[]
      updated: DeviceWatcherChangePayload<'updated'>[]
    }
    devices: MediaDeviceInfo[]
  }) => void
}

/**
 * Asynchronously returns an event emitter that notifies changes in the devices.
 * The possible events are:
 *
 *  - "added": a device has been added
 *  - "removed": a device has been removed
 *  - "updated": a device has been updated
 *  - "changed": any of the previous events occurred
 *
 * In all cases, your event handler gets as parameter an object `e` with the
 * following keys:
 *
 *  - `e.changes`: the changed devices. For "added", "removed", and "updated"
 *    event handlers, you only get the object associated to the respective event
 *    (i.e., only a list of added devices, removed devices, or updated devices).
 *    For "changed" event handlers, you get all three lists.
 *  - `e.devices`: the new list of devices
 *
 * For device-specific helpers, see {@link createCameraDeviceWatcher},
 * {@link createMicrophoneDeviceWatcher}, and {@link createSpeakerDeviceWatcher}.
 *
 * @param options if null, the event emitter is associated to all devices for
 * which we have permission. Otherwise, you can pass an object
 * `{targets: string}`, where the value for key targets is a list of categories.
 * Allowed categories are `"camera"`, `"microphone"`, and `"speaker"`.
 *
 * @example
 * Creating an event listener on the "changed" event and printing the received parameter after both connecting and disconnecting external headphones:
 * ```typescript
 * await SignalWire.WebRTC.getUserMedia({audio: true, video: false})
 * h = await SignalWire.WebRTC.createDeviceWatcher()
 * h.on('changed', (c) => console.log(c))
 * ```
 *
 * @example
 * Getting notified just for changes about audio input and output devices, ignoring the camera:
 * ```typescript
 * h = await SignalWire.WebRTC.createDeviceWatcher({targets: ['microphone', 'speaker']})
 * h.on('changed', (c) => console.log(c))
 * ```
 */
export const createDeviceWatcher = async (
  options: CreateDeviceWatcherOptions = {}
) => {
  const targets = await validateTargets({ targets: options.targets })
  const emitter = new EventEmitter<DeviceWatcherEvents>()
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

  const deviceChangeHandler = async () => {
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
  WebRTC.getMediaDevicesApi().addEventListener('devicechange', deviceChangeHandler)

  return emitter
}

/**
 * Asynchronously returns an event emitter that notifies changes in all
 * microphone devices. This is equivalent to calling
 * `createDeviceWatcher({ targets: ['microphone'] })`, so refer to
 * {@link createDeviceWatcher} for additional information about the returned
 * event emitter.
 */
export const createMicrophoneDeviceWatcher = () =>
  createDeviceWatcher({ targets: ['microphone'] })

/**
 * Asynchronously returns an event emitter that notifies changes in all speaker
 * devices. This is equivalent to calling
 * `createDeviceWatcher({ targets: ['speaker'] })`, so refer to
 * {@link createDeviceWatcher} for additional information about the returned
 * event emitter.
 */
export const createSpeakerDeviceWatcher = () =>
  createDeviceWatcher({ targets: ['speaker'] })

/**
 * Asynchronously returns an event emitter that notifies changes in all camera
 * devices. This is equivalent to calling
 * `createDeviceWatcher({ targets: ['camera'] })`, so refer to
 * {@link createDeviceWatcher} for additional information about the returned
 * event emitter.
 */
export const createCameraDeviceWatcher = () =>
  createDeviceWatcher({ targets: ['camera'] })
