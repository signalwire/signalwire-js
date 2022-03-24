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
 * });
 * ```
 *
 * @module
 */

/**
 * Access the Video API Consumer. You can instantiate a {@link Video.Client} to
 * subscribe to Video events. Please check {@link Video.VideoClientApiEvents}
 * for the full list of events that a {@link Video.Client} can subscribe to.
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
 * })
 * ```
 */
export * as Video from './video/Video'

export * from './createClient'

/**
 * Access the Chat API Consumer. You can instantiate a {@link Chat.Client} to
 * subscribe to Chat events. Please check {@link Chat.ChatClientApiEvents}
 * for the full list of events that a {@link Chat.Client} can subscribe to.
 *
 * ### Example
 *
 * The following example logs the messages sent to the "welcome" channel.
 *
 * ```javascript
 * const chatClient = new Chat.Client({
 *   project: '<project-id>',
 *   token: '<api-token>'
 * })
 *
 * chatClient.on('message', m => console.log(m))
 *
 * await chatClient.subscribe("welcome")
 * ```
 */
export * as Chat from './chat/Chat'

/** @ignore */
export * from './configure'

/** @ignore */
export * as Task from './task/Task'
export * as Messaging from './messaging/Messaging'
