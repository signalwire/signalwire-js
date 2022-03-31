import { ConsumerContract } from '@signalwire/core';
import { RealTimeMessagingApiEvents } from '../types';
import { RealtimeClient } from '../client/index'

export interface MessagingClientDocs extends ConsumerContract<RealTimeMessagingApiEvents> {
  new (opts: {
    /** SignalWire Project ID, e.g. `a10d8a9f-2166-4e82-56ff-118bc3a4840f` */
    project: string
    /** SignalWire API token, e.g. `PT9e5660c101cd140a1c93a0197640a369cf5f16975a0079c9` */
    token: string
    /** SignalWire contexts, e.g. 'home', 'office'... */
    contexts: string[]
  }): this

  /** @ignore */
  _session: RealtimeClient

  /**
   * Send an outbound SMS or MMS message.
   * 
   * @returns Asynchronously returns a result object.
   * 
   * @example
   * 
   * > Send a message in the context *office*.
   * 
   * ```js
   * const sendResult = await client.send({
   *   context: 'office',
   *   from: '+1xxx',
   *   to: '+1yyy',
   *   body: 'Hello World!'
   * })
   * 
   * if (sendResult.successful) {    FIXME We don't have a successful field. We have `code === '200'`
   *   console.log('Message ID: ', sendResult.messageId)
   * }
   * ```
   */
  send(params: {
    /** The context to receive inbound events. */
    context: string
    /** The phone number to place the message from. Must be a SignalWire phone number or short code that you own. */
    from: string
    /** The phone number to send to. */
    to: string
    /** The content of the message. Optional if `media` is present. */
    body?: string
    /** Array of strings to tag the message with for searching in the UI. */
    tags?: string[]
    /** FIXME */
    region?: string
    /** Array of URLs to send in the message. Optional if `body` is present. */
    media?: string[]
  }): Promise<any>  // FIXME @edolix

  /** @ignore */
  subscribe(): Promise<void>
}
