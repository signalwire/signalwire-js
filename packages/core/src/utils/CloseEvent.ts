/**
 * Polyfill the Event class for React Native platform
 */
class SwEvent {
  constructor(public type: string, public options?: EventInit) {}
}

// const EventClass =

/**
 * Class representing a close event.
 * The `ws` package does not expose it so we can easily create one in here.
 *
 * @extends Event
 */
export class CloseEvent
  extends (typeof Event === 'function' ? Event : SwEvent)
  implements Event
{
  public code: number
  public reason: string
  public wasClean: boolean
  constructor(
    type: string,
    options: { code?: number; reason?: string; wasClean?: boolean } = {}
  ) {
    super(type)

    this.code = options.code === undefined ? 0 : options.code
    this.reason = options.reason === undefined ? '' : options.reason
    this.wasClean = options.wasClean === undefined ? false : options.wasClean
  }

  bubbles: boolean
  cancelBubble: boolean
  cancelable: boolean
  composed: boolean
  currentTarget: EventTarget | null
  defaultPrevented: boolean
  eventPhase: number
  isTrusted: boolean
  returnValue: boolean
  srcElement: EventTarget | null
  target: EventTarget | null
  timeStamp: number
  type: string
  composedPath(): EventTarget[] {
    console.warn('Method not implemented.')
    return []
  }
  initEvent(
    _type: string,
    _bubbles?: boolean | undefined,
    _cancelable?: boolean | undefined
  ): void {
    console.warn('Method not implemented.')
  }
  preventDefault(): void {
    console.warn('Method not implemented.')
  }
  stopImmediatePropagation(): void {
    console.warn('Method not implemented.')
  }
  stopPropagation(): void {
    console.warn('Method not implemented.')
  }
  NONE: 0
  CAPTURING_PHASE: 1
  AT_TARGET: 2
  BUBBLING_PHASE: 3
}
