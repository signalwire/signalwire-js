import { CreateRoomObjectOptions, createRoomObject } from './createRoomObject'

/**
 * Using Video.joinRoom() you can automatically join a room.
 *
 * @example
 * With an HTMLDivElement with id="root" in the DOM.
 * ```js
 * // <div id="root"></div>
 *
 * try {
 *   const roomObj = await Video.joinRoom({
 *     token: '<YourJWT>',
 *     rootElementId: 'root',
 *   })
 *
 *   // You have joined the room..
 * } catch (error) {
 *   console.error('Error', error)
 * }
 * ```
 * @deprecated Use {@link RoomSession} instead.
 */
export const joinRoom = (roomOptions: {
  /** SignalWire project id, e.g. `a10d8a9f-2166-4e82-56ff-118bc3a4840f` */
  project?: string
  /** SignalWire project token, e.g. `PT9e5660c101cd140a1c93a0197640a369cf5f16975a0079c9` */
  token: string
  /** logging level */
  logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent'
  /** Id of the HTML element in which to display the video stream */
  rootElementId?: string
  /** Whether to apply the local-overlay on top of your video. Default: `true`. */
  applyLocalVideoOverlay?: boolean
  /** Whether to stop the camera when the member is muted. Default: `true`. */
  stopCameraWhileMuted?: boolean
  /** Whether to stop the microphone when the member is muted. Default: `true`. */
  stopMicrophoneWhileMuted?: boolean
  /** List of ICE servers. */
  iceServers?: RTCIceServer[]
  /** Audio constraints to use when joining the room. Default: `true`. */
  audio?: MediaStreamConstraints['audio']
  /** Video constraints to use when joining the room. Default: `true`. */
  video?: MediaStreamConstraints['video']
  /** Id of the speaker device to use for audio output. If undefined, picks a default speaker. */
  speakerId?: string
}) => {
  return createRoomObject({
    ...roomOptions,
    autoJoin: true,
  })
}
