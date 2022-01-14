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

  publish(params: {
    message: any
    channel: string
    meta?: Record<any, any>
  }): Promise<any>

  getMessages(params: {
    channel: string
    cursor?: {
      after?: string
      before?: string
    }
  }): Promise<any>

  getMembers(params: { channel: string }): Promise<any>

  setMemberState(params: {
    channels: string | string[]
    state: Record<any, any>
  }): Promise<any>

  getMemberState(params: {
    channels: string | string[]
    memberId: string
  }): Promise<any>

}
