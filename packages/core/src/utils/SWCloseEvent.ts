/**
 * Class representing a close event.
 * The `ws` package does not expose it so we can easily create one in here.
 *
 * @extends Event
 */
export class SWCloseEvent {
  public code: number
  public reason: string
  public wasClean: boolean
  constructor(
    public type: string,
    options: { code?: number; reason?: string; wasClean?: boolean } = {}
  ) {
    this.code = options.code === undefined ? 0 : options.code
    this.reason = options.reason === undefined ? '' : options.reason
    this.wasClean = options.wasClean === undefined ? false : options.wasClean
  }
}
