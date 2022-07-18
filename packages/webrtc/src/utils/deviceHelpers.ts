import { getLogger, EventEmitter } from '@signalwire/core'
import {
  getMediaDevicesApi,
  stopStream,
  supportsMediaOutput,
} from './primitives'
import type { DevicePermissionName } from './index'
import {
  getUserMedia,
  enumerateDevices,
  enumerateDevicesByKind,
  checkPermissions,
  checkCameraPermissions,
  checkMicrophonePermissions,
  checkSpeakerPermissions,
  _getMediaDeviceKindByName,
} from './index'

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
 * @deprecated Use {@link getDevices} for better cross browser compatibility.
 */
export const getDevicesWithPermissions = async (
  kind?: DevicePermissionName,
  fullList: boolean = false
): Promise<MediaDeviceInfo[]> => getDevices(kind, fullList)

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
 * @deprecated Use {@link getCameraDevices} for better cross browser compatibility.
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
 * @deprecated Use {@link getMicrophoneDevices} for better cross browser compatibility.
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
 * @deprecated Use {@link getSpeakerDevices} for better cross browser compatibility.
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
 * `name` is provided, only the devices of the specified kind are returned.
 * Possible values of the `name` parameters are `"camera"`, `"microphone"`, and
 * `"speaker"`, which respectively correspond to functions
 * {@link getCameraDevices}, {@link getMicrophoneDevices}, and
 * {@link getSpeakerDevices}.
 *
 * @param name filter for this device category
 * @param fullList Default to false. Set to true to retrieve the raw list as returned by
 * the browser, which might include multiple, duplicate deviceIds for the same group.
 *
 * @example
 * ```typescript
 * await SignalWire.WebRTC.getDevices("camera", true)
 * // [
 * //   {
 * //     "deviceId": "3c4f97...",
 * //     "kind": "videoinput",
 * //     "label": "HD Camera",
 * //     "groupId": "828fec..."
 * //   }
 * // ]
 * ```
 */
export const getDevices = async (
  name?: DevicePermissionName,
  fullList: boolean = false
): Promise<MediaDeviceInfo[]> => {
  const hasPerms = await checkPermissions(name)
  let stream: MediaStream | undefined = undefined
  if (hasPerms === false) {
    const constraints = _constraintsByKind(name)
    stream = await getUserMedia(constraints)
  }

  const devices = await enumerateDevicesByKind(_getMediaDeviceKindByName(name))

  /**
   * Firefox requires an active stream at the time of `enumerateDevices`
   * so we need to stop it after `WebRTC.enumerateDevicesByKind`
   */
  if (stream) {
    stopStream(stream)
  }

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

  getLogger().debug('[_getDeviceListDiff] <- oldDevices', oldDevices)
  getLogger().debug('[_getDeviceListDiff] -> newDevices', newDevices)

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
  // FIXME: Replace this object with just checkPermissions(<target>)
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
    speaker: supportsMediaOutput,
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
      getLogger().warn(
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

    getLogger().warn(
      `${unsupportedTargets}${needPermissions}We'll be watching for the following targets instead: "${filteredTargets.join(
        ', '
      )}"`
    )
  }

  getLogger().debug(`Watching these targets: "${filteredTargets.join(', ')}"`)
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

// FIXME: Move createDeviceWatcher and all related helpers/derived methods to its own module

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
  const currentDevices = await enumerateDevices()
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
    const currentDevices = await enumerateDevices()
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
  getMediaDevicesApi().addEventListener('devicechange', deviceChangeHandler)

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

const isMediaStream = (options: any): options is MediaStream => {
  return typeof options?.getTracks === 'function'
}

// FIXME: Move getMicrophoneAnalyzerMediaStream and all related helpers/derived methods to its own module

const getMicrophoneAnalyzerMediaStream = async (
  options: string | MediaTrackConstraints | MediaStream
) => {
  if (isMediaStream(options)) {
    return options
  }

  let constraints: MediaStreamConstraints
  if (typeof options === 'string') {
    constraints = {
      audio: {
        deviceId: options,
      },
    }
  } else {
    constraints = {
      audio: options,
    }
  }

  return getUserMedia(constraints)
}

const createAnalyzer = (audioContext: AudioContext) => {
  const analyser = audioContext.createAnalyser()
  analyser.fftSize = 64
  analyser.minDecibels = -90
  analyser.maxDecibels = -10
  analyser.smoothingTimeConstant = 0.85

  return analyser
}

const MAX_VOLUME = 100

interface MicrophoneAnalyzerEvents {
  volumeChanged: (volume: number) => void
  destroyed: (reason: null | 'error' | 'disconnected') => void
}

interface MicrophoneAnalyzer extends EventEmitter<MicrophoneAnalyzerEvents> {
  destroy(): void
}

/**
 * Initializes a microphone analyzer. You can use a MicrophoneAnalyzer to track
 * the input audio volume.
 *
 * To stop the analyzer, plase call the `destroy()` method on the object
 * returned by this method.
 *
 * The returned object emits the following events:
 *
 *   - `volumeChanged`: instantaneous volume from 0 to 100
 *   - `destroyed`: the object has been destroyed. You get a parameter
 *     describing the reason, which can be `null` (if you called `destroy()`),
 *     `"error"` (in case of errors), or `"disconnected"` (if the device was
 *     disconnected).
 *
 * @example
 *
 * ```js
 * const micAnalyzer = await createMicrophoneAnalyzer('device-id')
 *
 * micAnalyzer.on('volumeChanged', (vol) => {
 *   console.log("Volume: ", vol)
 * })
 * micAnalyzer.on('destroyed', (reason) => {
 *   console.log('Microphone analyzer destroyed', reason)
 * })
 *
 * micAnalyzer.destroy()
 * ```
 *
 * @param options either the id of the device to analize, or
 * [MediaStreamConstraints](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamConstraints),
 * or a
 * [MediaStream](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream).
 *
 * @returns Asynchronously returns a MicrophoneAnalyzer.
 */
export const createMicrophoneAnalyzer = async (
  options: string | MediaTrackConstraints | MediaStream
): Promise<MicrophoneAnalyzer> => {
  const stream = await getMicrophoneAnalyzerMediaStream(options)

  if (!stream) {
    throw new Error('Failed to get the audio stream')
  }

  const emitter = new EventEmitter<MicrophoneAnalyzerEvents>()
  const audioContext = new (window.AudioContext ||
    (window as any).webkitAudioContext)()
  const analyser = createAnalyzer(audioContext)
  let rafId: number | undefined
  let volume: number | undefined

  try {
    audioContext.createMediaStreamSource(stream).connect(analyser)
  } catch (error) {
    throw new Error('No audio track found')
  }

  /**
   * If the device gets disconnected, we'll notify the user of
   * the change.
   */
  stream.getAudioTracks().forEach((track) => {
    track.addEventListener('ended', () => {
      emitter.emit('destroyed', 'disconnected')
    })
  })

  const startMetering = () => {
    try {
      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      analyser.getByteFrequencyData(dataArray)
      /**
       * dataArray contains the values of the volume
       * gathered within a single requestAnimationFrame With
       * reduce and divide by 20 we translate the array
       * values into a 0-100 scale to draw the green bars
       * for the voice/volume energy.
       */
      const latestVol =
        dataArray.reduce((final, value) => final + value, 0) / 20

      if (volume !== latestVol) {
        volume = latestVol
        emitter.emit('volumeChanged', Math.min(volume, MAX_VOLUME))
      }
      rafId = requestAnimationFrame(startMetering)
    } catch (e) {
      emitter.emit('destroyed', 'error')
    }
  }
  rafId = requestAnimationFrame(startMetering)

  const destroy = () => {
    if (rafId) {
      cancelAnimationFrame(rafId)
    }
    if (audioContext.state !== 'closed') {
      audioContext.close().catch((error) => {
        getLogger().error('Error closing the AudioContext', error)
      })
    }
    /**
     * If the user provided a MediaStream, we don't need to
     * close it.
     */
    if (!isMediaStream(options)) {
      stream.getTracks().forEach((track) => track.stop())
    }
    emitter.emit('destroyed', null)
    emitter.removeAllListeners()
  }

  return new Proxy<MicrophoneAnalyzer>(
    // @ts-expect-error
    emitter,
    {
      get(target, prop: keyof MicrophoneAnalyzer, receiver: any) {
        if (prop === 'destroy') {
          return destroy
        }
        return Reflect.get(target, prop, receiver)
      },
    }
  )
}
