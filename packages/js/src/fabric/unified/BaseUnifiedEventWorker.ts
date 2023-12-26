import {
  EventEmitter,
  InternalSDKLogger,
  VideoAPIEventParams,
  getLogger,
} from '@signalwire/core'
import { MapToPubSubShape } from 'packages/core/dist/core/src'

export abstract class BaseUnifiedEventWorker<
  T extends EventEmitter.ValidEventTypes = string | symbol
> {
  protected logger: InternalSDKLogger
  protected emitter: EventEmitter<T>

  //FIXME type
  constructor(dependencies: any) {
    this.logger = getLogger()

    this.emitter = dependencies.instance
  }

  abstract worksWith(action: MapToPubSubShape<VideoAPIEventParams>): boolean

}

export abstract class BaseUnifiedEventMapper extends BaseUnifiedEventWorker {

  //FIXME type
  abstract map(
    action: MapToPubSubShape<VideoAPIEventParams>
  ): MapToPubSubShape<VideoAPIEventParams>
}

export abstract class BaseUnifiedEventHandler extends BaseUnifiedEventWorker {
  //FIXME type
  abstract handle(
    action: MapToPubSubShape<VideoAPIEventParams>
  ): void
}