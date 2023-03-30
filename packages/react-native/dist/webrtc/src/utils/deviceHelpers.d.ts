import { EventEmitter } from '@signalwire/core';
import type { DevicePermissionName } from './index';
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
export declare const getDevicesWithPermissions: (kind?: DevicePermissionName, fullList?: boolean) => Promise<MediaDeviceInfo[]>;
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
export declare const getCameraDevicesWithPermissions: () => Promise<MediaDeviceInfo[]>;
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
export declare const getMicrophoneDevicesWithPermissions: () => Promise<MediaDeviceInfo[]>;
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
export declare const getSpeakerDevicesWithPermissions: () => Promise<MediaDeviceInfo[]>;
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
export declare const getDevices: (name?: DevicePermissionName, fullList?: boolean) => Promise<MediaDeviceInfo[]>;
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
export declare const getCameraDevices: () => Promise<MediaDeviceInfo[]>;
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
export declare const getMicrophoneDevices: () => Promise<MediaDeviceInfo[]>;
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
export declare const getSpeakerDevices: () => Promise<MediaDeviceInfo[]>;
/**
 * Assure a deviceId exists in the current device list from the browser.
 * It checks for deviceId or label - in case the UA changed the deviceId randomly
 */
export declare const assureDeviceId: (id: string, label: string, name: DevicePermissionName) => Promise<string | null>;
/**
 * Helper methods to assure a deviceId without asking the user the "kind"
 */
export declare const assureVideoDevice: (id: string, label: string) => Promise<string | null>;
export declare const assureAudioInDevice: (id: string, label: string) => Promise<string | null>;
export declare const assureAudioOutDevice: (id: string, label: string) => Promise<string | null>;
interface CreateDeviceWatcherOptions {
    targets?: DevicePermissionName[];
}
declare type DeviceWatcherEventNames = 'added' | 'changed' | 'removed' | 'updated';
declare type DeviceWatcherChangePayload<T extends DeviceWatcherEventNames> = {
    type: T;
    payload: MediaDeviceInfo;
};
declare type DeviceWatcherChange<T extends DeviceWatcherEventNames> = {
    changes: DeviceWatcherChangePayload<T>[];
    devices: MediaDeviceInfo[];
};
interface DeviceWatcherEvents {
    added: (params: DeviceWatcherChange<'added'>) => void;
    removed: (params: DeviceWatcherChange<'removed'>) => void;
    updated: (params: DeviceWatcherChange<'updated'>) => void;
    changed: (params: {
        changes: {
            added: DeviceWatcherChangePayload<'added'>[];
            removed: DeviceWatcherChangePayload<'removed'>[];
            updated: DeviceWatcherChangePayload<'updated'>[];
        };
        devices: MediaDeviceInfo[];
    }) => void;
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
export declare const createDeviceWatcher: (options?: CreateDeviceWatcherOptions) => Promise<EventEmitter<DeviceWatcherEvents, any>>;
/**
 * Asynchronously returns an event emitter that notifies changes in all
 * microphone devices. This is equivalent to calling
 * `createDeviceWatcher({ targets: ['microphone'] })`, so refer to
 * {@link createDeviceWatcher} for additional information about the returned
 * event emitter.
 */
export declare const createMicrophoneDeviceWatcher: () => Promise<EventEmitter<DeviceWatcherEvents, any>>;
/**
 * Asynchronously returns an event emitter that notifies changes in all speaker
 * devices. This is equivalent to calling
 * `createDeviceWatcher({ targets: ['speaker'] })`, so refer to
 * {@link createDeviceWatcher} for additional information about the returned
 * event emitter.
 */
export declare const createSpeakerDeviceWatcher: () => Promise<EventEmitter<DeviceWatcherEvents, any>>;
/**
 * Asynchronously returns an event emitter that notifies changes in all camera
 * devices. This is equivalent to calling
 * `createDeviceWatcher({ targets: ['camera'] })`, so refer to
 * {@link createDeviceWatcher} for additional information about the returned
 * event emitter.
 */
export declare const createCameraDeviceWatcher: () => Promise<EventEmitter<DeviceWatcherEvents, any>>;
interface MicrophoneAnalyzerEvents {
    volumeChanged: (volume: number) => void;
    destroyed: (reason: null | 'error' | 'disconnected') => void;
}
interface MicrophoneAnalyzer extends EventEmitter<MicrophoneAnalyzerEvents> {
    destroy(): void;
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
export declare const createMicrophoneAnalyzer: (options: string | MediaTrackConstraints | MediaStream) => Promise<MicrophoneAnalyzer>;
export {};
//# sourceMappingURL=deviceHelpers.d.ts.map