import type {
  ConsumerContract,
} from '@signalwire/core'

import type {
  ClientApiEvents,
  ClientFullState
} from './Client'

export interface ClientDocs extends
  Omit<ConsumerContract<ClientApiEvents, ClientFullState>, 'subscribe'> {

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
   * const chatClient = new Chat.Client({
   *   token: '<your chat token>'
   * })
   *
   * chatClient.on('message', m => console.log(m))
   *
   * await chatClient.subscribe("my-channel")
   * await chatClient.subscribe(["chan-2", "chan-3"])
   * ```
   */
  subscribe(channels: string | string[]): Promise<any>

  /**
   * List of channels from which you want to unsubscribe.
   *
   * @param channels the channels to unsubscribe from, either in the form of a
   * string (for one channel) or an array of strings.
   * 
   * @example
   * ```js
   * await chatClient.unsubscribe("my-channel")
   * await chatClient.unsubscribe(["chan-2", "chan-3"])
   * ```
   */
  unsubscribe(channels: string | string[]): Promise<any>

  /**
   * Publish a message into the specified channel.
   *
   * @example Publishing a message as a string:
   * ```js
   * await chatClient.publish({
   *   channel: 'my-channel',
   *   message: 'Hello, world.'
   * })
   * ```
   * 
   * @example Publishing a message as an object:
   * ```js
   * await chatClient.publish({
   *   channel: 'my-channel',
   *   message: {
   *     field_one: 'value_one',
   *     field_two: 'value_two',
   *   }
   * })
   * ```
   */
  publish(params: {
    /** The message to send. This can be any JSON-serializable object. */
    message: any
    /** Channel in which to send the message. */
    channel: string
    /**
     * Metadata associated with the message. There are no requirements on the
     * content of metadata.
     */
    meta?: Record<any, any>
  }): Promise<any>

  getMessages(params: {
    channel: string
    cursor?: {
      after?: string
      before?: string
    }
  }): Promise<any>

  /**
   * Returns the list of members in the given channel.
   * 
   * @example
   * ```js
   * const m = await chatClient.getMembers({ channel: 'my-channel' })
   * 
   * m.members.length;  // 7
   * m.members[0];  // { id: ..., channel: ..., state: ... }
   * ```
   */
  getMembers(params: {
    /** The channel for which to get the list of members. */
    channel: string
  }): Promise<any>

  /**
   * Sets a state object for the current member, for the specified channels. The
   * previous state object will be completely replaced.
   *
   * @example
   * ```js
   * await chatClient.setMemberState({
   *   channels: ['chan1', 'chan2'],
   *   state: {
   *     online: true,
   *     typing: false
   *   }
   * })
   * ```
   */
  setMemberState(params: {
    /** Channels for which to set the state. */
    channels: string | string[]
    /**
     * The state to set. There are no requirements on the content of the state.
     */
    state: Record<any, any>
  }): Promise<any>

  /**
   * Returns the states of a member in the specified channels.
   * 
   * @example
   * ```js
   * const s = await chatClient.getMemberState({
   *   channels: ['chan1', 'chan2'],
   *   memberId: 'my-member-id'
   * })
   * 
   * s.channels.length;  // 2
   * s.channels.chan1.state;  // the state object for chan1
   * ```
   */
  getMemberState(params: {
    /** Channels for which to get the state. */
    channels: string | string[]
    /** Id of the member for which to get the state. */
    memberId: string
  }): Promise<any>

}
