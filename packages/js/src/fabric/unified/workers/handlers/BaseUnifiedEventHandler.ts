import { EventEmitter, InternalSDKLogger, getLogger } from '@signalwire/core'

export class BaseUnifiedEventHandler<
  T extends EventEmitter.ValidEventTypes = string | symbol
> {
  protected logger: InternalSDKLogger
  protected emitter: EventEmitter<T>

  constructor(dependencies: any) {
    this.logger = getLogger()

    //FIXME
    this.emitter = dependencies.instance
  }

  isHandlerFor(_type: string) {
    return true
  }

  handle(type: any, payload: any) {
    //@ts-ignore
    this.emitter.emit(type, payload)
  }
}
