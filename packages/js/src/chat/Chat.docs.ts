/**
 * List of events emitted by a {@link Chat} object.
 */
export interface ChatEvents {
  /**
   * A message has been received. The event handler receives a parameter
   * `e` containing information about the message. In particular:
   * 
   *  - `e.timestamp` contains the timestamp
   *  - `e.params.message` contains the message
   *  - `e.params.channel` contains the channel
   *
   * @event
   */
  'message': undefined
}