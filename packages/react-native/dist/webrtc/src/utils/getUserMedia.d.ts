/**
 * Prompts the user to share one or more media devices and asynchronously
 * returns an associated [MediaStream](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream)
 * object.
 *
 * For more information, see [`MediaDevices.getUserMedia()`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).
 *
 * @param constraints an optional [MediaStreamConstraints](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamConstraints)
 *                    object specifying requirements for the returned [MediaStream](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream).
 *
 * @example
 * To only request audio media:
 *
 * ```typescript
 * await SignalWire.WebRTC.getUserMedia({audio: true, video: false})
 * // MediaStream {id: "HCXy...", active: true, ...}
 * ```
 *
 * @example
 * To request both audio and video, specifying constraints for the video:
 *
 * ```typescript
 * const constraints = {
 *   audio: true,
 *   video: {
 *     width: { min: 1024, ideal: 1280, max: 1920 },
 *     height: { min: 576, ideal: 720, max: 1080 }
 *   }
 * }
 * await SignalWire.WebRTC.getUserMedia(constraints)
 * // MediaStream {id: "EDVk...", active: true, ...}
 * ```
 */
export declare const getUserMedia: (constraints?: MediaStreamConstraints) => Promise<MediaStream>;
//# sourceMappingURL=getUserMedia.d.ts.map