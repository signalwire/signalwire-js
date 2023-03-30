export declare const RTCPeerConnection: (config: RTCConfiguration) => any;
/**
 * Returns whether the current environment supports the media devices API.
 */
export declare const supportsMediaDevices: () => boolean;
/**
 * Returns the mediaDevices object if supported, otherwise throws an error.
 */
export declare const getMediaDevicesApi: () => any;
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
 * Not supported on React Native
 */
export declare const getSupportedConstraints: () => {};
export declare const streamIsValid: (stream: RNMediaStream) => any;
/**
 * Returns whether the current environment supports the selection of a media output device.
 * Not supported in React Native.
 */
export declare const supportsMediaOutput: () => boolean;
export declare const setMediaElementSinkId: (_htmlElementId: string, _deviceId: string) => Promise<boolean>;
export declare const sdpToJsonHack: (sdp: any) => any;
export declare const stopStream: (stream: RNMediaStream) => void;
export declare const stopTrack: (track: MediaStreamTrack) => void;
export declare type DevicePermissionName = 'camera' | 'microphone' | 'speaker';
export declare const _getMediaDeviceKindByName: (name?: DevicePermissionName) => MediaDeviceKind | undefined;
//# sourceMappingURL=primitives.native.d.ts.map