import { VideoAPIEventParams } from '@signalwire/core'
import { MapToPubSubShape } from 'packages/core/dist/core/src'
import { BaseUnifiedEventMapper } from '../../BaseUnifiedEventWorker'

export class UnifiedEventsStateMapper extends BaseUnifiedEventMapper {
  worksWith(action: MapToPubSubShape<VideoAPIEventParams>): boolean {
    const { type = '', payload = {} } = action

    const isStateEvent = (type: string, suffix: string) =>
      type.endsWith(`.${suffix}`)

    const stateKey = Object.keys(payload).find((k) => k.includes('_state'))

    //@ts-ignore FIXME
    return !!stateKey && !isStateEvent(type, payload[stateKey])
  }

  map(
    action: MapToPubSubShape<VideoAPIEventParams>
  ): MapToPubSubShape<VideoAPIEventParams> {
    const { type = '', payload } = action

    return {
      //@ts-ignore
      type: `${type}.${payload[stateKey]}`,
      payload,
    }
  }
}
