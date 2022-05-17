import { connect, BaseComponentOptions, toExternalJSON } from '@signalwire/core'
import type {
  EmitterContract,
  EventTransform,
  CallingCallReceiveEventParams,
  VoiceDeviceBuilder,
  VoiceCallDialPhoneMethodParams,
  VoiceCallDialSipMethodParams,
} from '@signalwire/core'
import { RealtimeClient } from '../client/index'
import { createCallObject, Call } from './Call'
import { voiceCallReceiveWorker } from './workers'
import { DeviceBuilder } from './DeviceBuilder'
import type { RealTimeCallApiEvents } from '../types'
import { AutoApplyTransformsConsumer } from '../AutoApplyTransformsConsumer'

export * from './VoiceClient'
export { DeviceBuilder }
export { Playlist } from './Playlist'

/**
 * List of events for {@link Voice.Call}.
 */
export interface RealTimeVoiceApiEvents extends RealTimeCallApiEvents {}

type EmitterTransformsEvents = 'calling.call.received'

export interface Voice extends EmitterContract<RealTimeVoiceApiEvents> {
  /** @internal */
  _session: RealtimeClient
  dial(dialer: VoiceDeviceBuilder): Promise<Call>
  dialPhone(params: VoiceCallDialPhoneMethodParams): Promise<Call>
  dialSip(params: VoiceCallDialSipMethodParams): Promise<Call>
}

/** @internal */
class VoiceAPI extends AutoApplyTransformsConsumer<RealTimeVoiceApiEvents> {
  /** @internal */
  protected _eventsPrefix = 'calling' as const

  constructor(options: BaseComponentOptions<RealTimeVoiceApiEvents>) {
    super(options)

    this.runWorker('voiceCallReceiveWorker', {
      worker: voiceCallReceiveWorker,
    })

    this._attachListeners('')
  }

  /** @internal */
  protected getEmitterTransforms() {
    return new Map<
      EmitterTransformsEvents | EmitterTransformsEvents[],
      EventTransform
    >([
      [
        'calling.call.received',
        {
          mode: 'no-cache',
          type: 'voiceCallReceived',
          instanceFactory: (_payload: any) => {
            return createCallObject({
              store: this.store,
              // @ts-expect-error
              emitter: this.emitter,
            })
          },
          payloadTransform: (payload: CallingCallReceiveEventParams) => {
            return toExternalJSON(payload)
          },
        },
      ],
    ])
  }

  dialPhone({ region, ...params }: VoiceCallDialPhoneMethodParams) {
    const devices = new DeviceBuilder().add(DeviceBuilder.Phone(params))
    // dial is available through the VoiceClient Proxy
    // @ts-expect-error
    return this.dial({
      region,
      devices,
    })
  }

  dialSip({ region, ...params }: VoiceCallDialSipMethodParams) {
    const devices = new DeviceBuilder().add(DeviceBuilder.Sip(params))
    // dial is available through the VoiceClient Proxy
    // @ts-expect-error
    return this.dial({
      region,
      devices,
    })
  }
}

/** @internal */
export const createVoiceObject = (
  params: BaseComponentOptions<RealTimeVoiceApiEvents>
): Voice => {
  const voice = connect<RealTimeVoiceApiEvents, VoiceAPI, Voice>({
    store: params.store,
    Component: VoiceAPI,
    componentListeners: {
      errors: 'onError',
      responses: 'onSuccess',
    },
  })(params)

  return voice
}
