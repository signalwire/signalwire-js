import { CloseEvent as CoreCloseEvent } from '@signalwire/core'

const SwCloseEvent =
  typeof CloseEvent === 'function' ? CloseEvent : CoreCloseEvent

export { SwCloseEvent }
