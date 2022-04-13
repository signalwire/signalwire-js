import { MessageContract } from '../messaging/Message'

export interface MessagingClientApiEventsDocs {
  /**
   * Emitted whenever a message is received. Your event handler receives a
   * message object. Example:
   *
   * ```javascript
   * const client = new Messaging.Client(...)
   * client.on('message.received', (message) => {
   *   console.log('Message received:', message)
   *   // message.from
   *   // message.to
   *   // message.body
   *   // ...
   * })
   * ```
   *
   * @param message The message that has been received.
   *
   * @event
   */
  'message.received': (message: MessageContract) => void

  /**
   * Emitted when the status of a message is updated. You can use this event to
   * track the different stages that an outbound message goes through for
   * delivery. Example:
   * 
   * ```javascript
   * const client = new Messaging.Client(...)
   * client.on('message.updated', (message) => {
   *   console.log('Message updated:', message)
   *   // message.from
   *   // message.to
   *   // message.direction
   *   // message.state
   *   // ...
   * })
   * 
   * client.send(...)
   * ```
   *
   * @param message The message.
   *
   * @event
   */
  'message.updated': (message: MessageContract) => void
}
