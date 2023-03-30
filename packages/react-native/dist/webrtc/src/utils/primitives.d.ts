export declare const RTCPeerConnection: (config: RTCConfiguration) => RTCPeerConnection;
/**
 * Returns whether the current environment supports the media devices API.
 */
export declare const supportsMediaDevices: () => boolean;
/**
 * Returns the mediaDevices object if supported, otherwise throws an error.
 */
export declare const getMediaDevicesApi: () => MediaDevices;
/**
 * Returns whether the current environment supports `getUserMedia`.
 */
export declare const supportsGetUserMedia: () => boolean;
/**
 * Returns whether the current environment supports `getDisplayMedia`.
 */
export declare const supportsGetDisplayMedia: () => boolean;
/**
 * Returns a dictionary whose fields specify the constrainable properties the user agent understands.
 */
export declare const getSupportedConstraints: () => MediaTrackSupportedConstraints;
export declare const streamIsValid: (stream?: MediaStream) => boolean | undefined;
/**
 * Returns whether the current environment supports the selection of a media output device.
 */
export declare const supportsMediaOutput: () => boolean;
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
export declare const setMediaElementSinkId: (el: HTMLMediaElement | null, deviceId: string) => Promise<undefined>;
export declare const sdpToJsonHack: (sdp: any) => any;
export declare const stopStream: (stream?: MediaStream) => void;
export declare const stopTrack: (track: MediaStreamTrack) => void;
export declare type DevicePermissionName = 'camera' | 'microphone' | 'speaker';
export declare const _getMediaDeviceKindByName: (name?: DevicePermissionName) => MediaDeviceKind | undefined;
//# sourceMappingURL=primitives.d.ts.map