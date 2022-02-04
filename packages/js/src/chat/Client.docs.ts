import type { ConsumerContract, Chat } from '@signalwire/core'

import type { ClientApiEvents, ClientFullState } from './Client'

export type PagingCursor =
  | {
      before: string
      after?: never
    }
  | {
      before?: never
      after: string
    }

export interface ClientDocs
  extends Omit<
    ConsumerContract<ClientApiEvents, ClientFullState>,
    'subscribe'
  > {
  /**
   * Creates a new Chat client.
   *
   * @example
   *
   * ```js
   * import { Chat } from '@signalwire/js'
   *
   * const chatClient = new Chat.Client({
   *   token: '<your_chat_token>',
   * })
   * ```
   */
  new (chatOptions: {
    /** SignalWire Chat token (you can get one with the REST APIs) */
    token: string
    /** @ignore */
    logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent'
  }): this

  /**
   * TBD
   *
   * @param token the new token to keep the session alive.
   *
   * @example
   * ```js
   * const chatClient = new Chat.Client({
   *   token: '<your chat token>'
   * })
   *
   * chatClient.on('session.expiring', async () => {
   *   const newToken = await fetchNewToken(..)
   *
   *   await chatClient.updateToken(newToken)
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
    content: any
    /** Channel in which to send the message. */
    channel: string
    /**
     * Metadata associated with the message. There are no requirements on the
     * content of metadata.
     */
    meta?: Record<any, any>
  }): Promise<any>

  /**
   * Returns the list of messages that were sent to the specified channel.
   *
   * @example
   * ```js
   * const m = await chatClient.getMessages({ channel: 'chan1' })
   *
   * m.messages.length;  // 23
   * m.messages[0];  // the most recent message
   * m.messages[0].member;  // the sender
   * m.messages[0].content;  // the content
   * m.messages[0].meta;  // the metadata (if any)
   *
   * m.cursor.next;  // if not null, there are more messages.
   *
   * // Get the next page using the cursor
   * const next = await chatClient.getMessages({
   *   channel: 'chan1',
   *   cursor: {
   *     after: m.cursor.after
   *   }
   * })
   * ```
   */
  getMessages(params: {
    /** Channel for which to retrieve the messages. */
    channel: string
    /** Cursor for pagination. */
    cursor?: PagingCursor
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

export interface ClientApiEventsDocs {
  /**
   * FIXME: docs
   * The session is going to expire.
   * Use the `updateToken` method to refresh
   */
  'session.expiring': () => void

  /**
   * A new message has been received.
   */
  message: (message: Chat.ChatMessage) => void

  /**
   * A new member joined the chat.
   */
  'member.joined': (member: Chat.ChatMember) => void

  /**
   * A member updated its state.
   */
  'member.updated': (member: Chat.ChatMember) => void

  /**
   * A member left the chat.
   */
  'member.left': (member: Chat.ChatMember) => void
}
