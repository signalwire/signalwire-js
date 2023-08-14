/**
 * Polyfill the Event class for React Native platform
 */
class SwEvent {
  constructor(public type: string, public options?: EventInit) {}
}

/**
 * Class representing a close event.
 * The `ws` package does not expose it so we can easily create one in here.
 *
 * @extends Event
 */
export class SWCloseEvent extends (typeof Event === 'function'
  ? Event
  : SwEvent) {
  public code: number
  public reason: string
  public wasClean: boolean
  public type: string
  constructor(
    type: string,
    options: { code?: number; reason?: string; wasClean?: boolean } = {}
  ) {
    super(type)

    this.type = type
    this.code = options.code === undefined ? 0 : options.code
    this.reason = options.reason === undefined ? '' : options.reason
    this.wasClean = options.wasClean === undefined ? false : options.wasClean
  }
}
