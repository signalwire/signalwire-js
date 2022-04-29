import type { Messaging, MessagingSendResult } from './Messaging'

type InheritedMembers =
  | '_session'
  | 'on'
  | 'off'
  | 'once'
  | 'removeAllListeners'
  | 'disconnect'

export interface MessagingClientDocs extends Pick<Messaging, InheritedMembers> {
  new (opts: {
    /** SignalWire Project ID, e.g. `a10d8a9f-2166-4e82-56ff-118bc3a4840f` */
    project: string
    /** SignalWire API token, e.g. `PT9e5660c101cd140a1c93a0197640a369cf5f16975a0079c9` */
    token: string
    /** SignalWire contexts, e.g. 'home', 'office'... */
    contexts: string[]
  }): this

  /**
   * Send an outbound SMS or MMS message.
   *
   * @returns Asynchronously returns a result object.
   *
   * @example
   *
   * > Send a message.
   *
   * ```js
   * try {
   *   const sendResult = await client.send({
   *     from: '+1xxx',
   *     to: '+1yyy',
   *     body: 'Hello World!'
   *   })
   *   console.log('Message ID: ', sendResult.messageId)
   * } catch (e) {
   *   console.error(e.message)
   * }
   * ```
   */
  send(params: {
    /**
     * Inbound events for the message will be received on this context. If not
     * specified, a `default` context will be used.
     */
    context?: string
    /**
     * The phone number to place the message from. Must be a SignalWire phone
     * number or short code that you own.
     */
    from: string
    /** The phone number to send to. */
    to: string
    /** The content of the message. Optional if `media` is present. */
    body?: string
    /** Array of strings to tag the message with for searching in the UI. */
    tags?: string[]
    /**
     * Region of the world to originate the message from. A default value is
     * picked based on account preferences or device location.
     */
    region?: string
    /** Array of URLs to send in the message. Optional if `body` is present. */
    media?: string[]
  }): Promise<MessagingSendResult>
}
