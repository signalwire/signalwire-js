import { PubSubAction } from '@signalwire/core'
import { UnifiedEventsHandlerInterface } from './UnifiedEventsHandlerInterface'

export class DebugUnifiedEventsHandler
  implements UnifiedEventsHandlerInterface
{
  private _emitter: { emit: (type: string, payload: any) => void }

  constructor(options: any) {
    this._emitter = options.instance
  }

  filter(_action: PubSubAction): boolean {
    return true
  }

  handle(action: PubSubAction): void {
    const { type, payload } = action
    this._emitter.emit(type, payload)
  }
}
