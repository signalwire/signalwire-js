export type TaskClientApiEventsDocs = {
  /**
   * Emitted whenever a task is received. Your event handler receives the
   * payload. Example:
   *
   * ```javascript
   * const video = new Task.Client(...)
   * client.on('task.received', (payload) => {
   *   console.log('Task Received', payload)
   *   // Do something with the payload...
   * })
   * ```
   * 
   * @param payload The message payload.
   * 
   * @event
   */
  'task.received': (payload: Record<string, unknown>) => void
}
