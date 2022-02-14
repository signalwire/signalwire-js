/**
 * You can use the realtime SDK to listen for and react to events from
 * SignalWire's RealTime APIs.
 *
 * To get started, create a realtime client, for example with
 * {@link Video.Client} and listen for events. For example:
 *
 * ```javascript
 * import { Video } from '@signalwire/realtime-api'
 *
 * const video = new Video.Client({
 *   project: '<project-id>',
 *   token: '<project-token>'
 * })
 *
 * video.on('room.started', async (roomSession) => {
 *   console.log("Room started")
 *
 *   roomSession.on('member.joined', async (member) => {
 *     console.log(member)
 *   })
 *
 *   await roomSession.subscribe()
 * });
 * ```
 *
 * @module
 */

/**
 * Access the Video API Consumer. You can instantiate a {@link Video.Client} to
 * subscribe to Video events.
 *
 * ### Example
 *
 * The following example logs whenever a room session is started or a user joins
 * it:
 *
 * ```javascript
 * const video = new Video.Client({ project, token })
 *
 * // Listen for events:
 * video.on('room.started', async (roomSession) => {
 *   console.log('Room has started:', roomSession.name)
 *
 *   roomSession.on('member.joined', async (member) => {
 *     console.log('Member joined:', member.name)
 *   })
 *
 *   await roomSession.subscribe()
 * })
 * ```
 *
 * ### Events
 * You can use this object to subscribe to the following events.
 *
 *  - **room.started**:
 *
 * Emitted when a room session is started. Your event handler receives an object
 * which is an instance of {@link Video.RoomSession}. Example:
 * ```typescript
 * const video = new Video.Client(...)
 * video.on('room.started', async (roomSession) => {
 *     console.log(roomSession.name)
 * })
 * ```
 *
 *  - **room.ended**:
 *
 * Emitted when a room session ends. Your event handler receives an object which
 * is an instance of {@link Video.RoomSession}.
 * ```typescript
 * const video = new Video.Client(...)
 * video.on('room.ended', async (roomSession) => {
 *     console.log(roomSession.name)
 * })
 * ```
 */
export * as Video from './video/Video'

export * from './createClient'