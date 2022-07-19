import { getMediaDevicesApi } from './primitives'

/**
 * Prompts the user to share the screen and asynchronously returns a
 * [MediaStream](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream)
 * object associated with a display or part of it.
 *
 * @param constraints an optional
 * [MediaStreamConstraints](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamConstraints)
 * object specifying requirements for the returned [MediaStream](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream).
 *
 * @example
 *  ```typescript
 * await SignalWire.WebRTC.getDisplayMedia()
 * // MediaStream {id: "HCXy...", active: true, ...}
 * ```
 */
export const getDisplayMedia = (constraints?: MediaStreamConstraints) => {
  return getMediaDevicesApi().getDisplayMedia(constraints)
}
