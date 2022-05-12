import type { ConsumerContract, PubSubPagingCursor, PubSub } from '@signalwire/core'

import type { ClientApiEvents, ClientFullState } from './Client'

/** @deprecated use {@link PubSubPagingCursor} */
export type PagingCursor = PubSubPagingCursor

export interface ClientDocs
  extends Omit<
    ConsumerContract<ClientApiEvents, ClientFullState>,
    'subscribe'
  > {
  /**
   * Creates a new PubSub client.
   *
   * @example
   *
   * ```js
   * import { PubSub } from '@signalwire/js'
   *
   * const pubSubClient = new PubSub.Client({
   *   token: '<your pubSub token>',
   * })
   * ```
   */
  new (pubSubOptions: {
    /** SignalWire PubSub token (you can get one with the REST APIs) */
    token: string
    /** @ignore */
    logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent'
  }): this

  /**
   * Replaces the token used by the client with a new one. You can use this
   * method to replace the token when for example it is expiring, in order to
   * keep the session alive.
   *
   * The new token can contain different channels from the previous one. In that
   * case, you will need to subscribe to the new channels if you want to receive
   * messages for those. Channels that were in the previous token but are not in
   * the new one will get unsubscribed automatically.
   *
   * @param token the new token.
   *
   * @example
   * ```js
   * const pubSubClient = new PubSub.Client({
   *   token: '<your pubSub token>'
   * })
   *
   * pubSubClient.on('session.expiring', async () => {
   *   const newToken = await fetchNewToken(..)
   *
   *   await pubSubClient.updateToken(newToken)
   * })
   * ```
   */
  updateToken(token: string): Promise<void>

  /**
   * List of channels for which you want to receive messages. You can only
   * subscribe to those channels for which your token has read permission.
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
   * const pubSub = new PubSub.Client({
   *   token: '<your pubSub token>'
   * })
   *
   * pubSub.on('message', m => console.log(m))
   *
   * await pubSub.subscribe("my-channel")
   * await pubSub.subscribe(["chan-2", "chan-3"])
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
   * await pubSub.unsubscribe("my-channel")
   * await pubSub.unsubscribe(["chan-2", "chan-3"])
   * ```
   */
  unsubscribe(channels: string | string[]): Promise<void>

  /**
   * Publish a message into the specified channel.
   *
   * @example Publishing a message as a string:
   * ```js
   * await pubSub.publish({
   *   channel: 'my-channel',
   *   content: 'Hello, world.'
   * })
   * ```
   *
   * @example Publishing a message as an object:
   * ```js
   * await pubSub.publish({
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
}

export interface ClientApiEventsDocs {
  /**
   * The session is going to expire.
   * Use the `updateToken` method to refresh your token.
   */
  'session.expiring': () => void

  /**
   * A new message has been received.
   */
  message: (message: PubSub.PubSubMessage) => void
}
