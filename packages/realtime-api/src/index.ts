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
 * @example
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

/** @ignore */
export * from './configure'

/**
 * Access the Messaging API. You can instantiate a {@link Messaging.Client} to
 * send or receive SMS and MMS. Please check
 * {@link Messaging.MessagingClientApiEvents} for the full list of events that
 * a {@link Messaging.Client} can subscribe to.
 *
 * @example
 *
 * The following example listens for incoming SMSs over an "office" context,
 * and also sends an SMS.
 *
 * ```javascript
 * const client = new Messaging.Client({
 *   project: "<project-id>",
 *   token: "<api-token>",
 *   contexts: ['office']
 * })
 *
 * client.on('message.received', (message) => {
 *   console.log('message.received', message)
 * })
 *
 * await client.send({
 *   from: '+1xxx',
 *   to: '+1yyy',
 *   body: 'Hello World!'
 * })
 * ```
 */
export * as Messaging from './messaging/Messaging'

export * as Chat from './chat/Chat'

export * as PubSub from './pubSub/PubSub'

export * as Task from './task/Task'

export * as Voice from './voice/Voice'

/**
 * Access all the SignalWire APIs with a single instance. You can initiate a {@link SignalWire} to
 * use Messaging, Chat, PubSub, Task, Voice, and Video APIs.
 *
 * @example
 *
 * The following example creates a single client and uses Task and Voice APIs.
 *
 * ```javascript
 * const client = await SignalWire({
 *   project: "<project-id>",
 *   token: "<api-token>",
 * })
 *
 * await client.task.listen({
 *  topics: ['office'],
 *  onTaskReceived: (payload) => {
 *    console.log('message.received', payload)}
 * })
 *
 * await client.task.send({
 *   topic: 'office',
 *   message: '+1yyy',
 * })
 *
 * await client.voice.listen({
 *  topics: ['office'],
 *  onCallReceived: (call) => {
 *    console.log('call.received', call)}
 * })
 *
 * await client.voice.dialPhone({
 *   from: '+1xxx',
 *   to: '+1yyy',
 * })
 * ```
 */
export * from './SignalWire'
