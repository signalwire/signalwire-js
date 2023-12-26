import { VideoAPIEventParams } from '@signalwire/core'
import { MapToPubSubShape } from 'packages/core/dist/core/src'
import { BaseUnifiedEventHandler } from '../../BaseUnifiedEventWorker'

export class PublisherUnifiedEventsWorker extends BaseUnifiedEventHandler {

    worksWith(_action: MapToPubSubShape<VideoAPIEventParams>): boolean {
        return true
    }

    handle(action: MapToPubSubShape<VideoAPIEventParams>): void {
        const {type, payload} = action
        this.emitter.emit(type, payload)
    }
    
}
