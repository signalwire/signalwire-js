/** @ignore */
export * from './configure'

export * as Messaging from './messaging/Messaging'

export * as Chat from './chat/Chat'

export * as PubSub from './pubSub/PubSub'

export * as Task from './task/Task'

export * as Voice from './voice/Voice'

export * as Video from './video/Video'

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
