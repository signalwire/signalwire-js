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
export declare const enumerateDevices: () => Promise<MediaDeviceInfo[]>;
export declare const enumerateDevicesByKind: (filterByKind?: MediaDeviceKind) => Promise<MediaDeviceInfo[]>;
//# sourceMappingURL=enumerateDevices.d.ts.map