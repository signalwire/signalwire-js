declare type DevicePermissionName = 'camera' | 'microphone' | 'speaker';
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
export declare const checkPermissions: (name?: DevicePermissionName) => Promise<boolean | null>;
/**
 * Asynchronously returns whether we have permissions to access the camera.
 *
 * @example
 * ```typescript
 * await SignalWire.WebRTC.checkCameraPermissions()
 * // true
 * ```
 */
export declare const checkCameraPermissions: () => Promise<boolean | null>;
/**
 * Asynchronously returns whether we have permissions to access the microphone.
 *
 * @example
 * ```typescript
 * await SignalWire.WebRTC.checkMicrophonePermissions()
 * // true
 * ```
 */
export declare const checkMicrophonePermissions: () => Promise<boolean | null>;
/**
 * Asynchronously returns whether we have permissions to access the speakers.
 *
 * @example
 * ```typescript
 * await SignalWire.WebRTC.checkSpeakerPermissions()
 * // true
 * ```
 */
export declare const checkSpeakerPermissions: () => Promise<boolean | null>;
export {};
//# sourceMappingURL=permissions.d.ts.map