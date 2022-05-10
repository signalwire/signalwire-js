import { ConsumerContract } from '@signalwire/core'
import { PubSubClientApiEvents, ClientFullState } from './PubSubClient'
import { RealtimeClient } from '../client/index'

export interface ClientDocs
  extends Omit<
    ConsumerContract<PubSubClientApiEvents, ClientFullState>,
    'subscribe'
  > {
  /**
   * Creates a new PubSub client.
   *
   * @example
   *
   * ```js
   * import { PubSub } from '@signalwire/realtime-api'
   *
   * const pubSubClient = new PubSub.Client({
   *   project: '<project-id>',
   *   token: '<api-token>'
   * })
   * ```
   */
  new (pubSubOptions: {
    /** SignalWire project id, e.g. `a10d8a9f-2166-4e82-56ff-118bc3a4840f` */
    project: string
    /** SignalWire API token */
    token: string
  }): this

  /** @ignore */
  updateToken(token: string): Promise<void>

  /**
   * List of channels for which you want to receive messages.
   *
   * Note that the `subscribe` function is idempotent, and calling it again with
   * a different set of channels _will not_ unsubscribe you from the old ones.
   * To unsubscribe, use {@link unsubscribe}.
   *
   * @param channels the channels to subscribe to, either in the form of a
   * string (for one channel) or an array of strings.
   *
   * @example
   * ```js
   * const pubSubClient = new PubSub.Client({
   *   project: '<project-id>',
   *   token: '<api-token>'
   * })
   *
   * await pubSubClient.subscribe("my-channel")
   * await pubSubClient.subscribe(["chan-2", "chan-3"])
   * ```
   */
  subscribe(channels: string | string[]): Promise<void>

  /**
   * List of channels from which you want to unsubscribe.
   *
   * @param channels the channels to unsubscribe from, either in the form of a
   * string (for one channel) or an array of strings.
   *
   * @example
   * ```js
   * await pubSubClient.unsubscribe("my-channel")
   * await pubSubClient.unsubscribe(["chan-2", "chan-3"])
   * ```
   */
  unsubscribe(channels: string | string[]): Promise<void>

  /**
   * Publish a message into the specified channel.
   *
   * @example Publishing a message as a string:
   * ```js
   * await pubSubClient.publish({
   *   channel: 'my-channel',
   *   content: 'Hello, world.'
   * })
   * ```
   *
   * @example Publishing a message as an object:
   * ```js
   * await pubSubClient.publish({
   *   channel: 'my-channel',
   *   content: {
   *     field_one: 'value_one',
   *     field_two: 'value_two',
   *   }
   * })
   * ```
   */
  publish(params: {
    /** The message to send. This can be any JSON-serializable object. */
    content: any
    /** Channel in which to send the message. */
    channel: string
    /**
     * Metadata associated with the message. There are no requirements on the
     * content of metadata.
     */
    meta?: Record<any, any>
  }): Promise<void>

  /** @ignore */
  _session: RealtimeClient
}

export interface PubSubClientApiEventsDocs {
  /** @ignore */
  'session.expiring': () => void
}
