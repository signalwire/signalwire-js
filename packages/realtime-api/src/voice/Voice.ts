import { connect, BaseComponentOptions, toExternalJSON } from '@signalwire/core'
import type {
  EmitterContract,
  EventTransform,
  CallingCallReceiveEventParams,
  CreateVoiceDialerParams,
  VoiceDialer,
} from '@signalwire/core'
import { RealtimeClient } from '../client/index'
import { createCallObject, Call } from './Call'
import { voiceCallReceiveWorker } from './workers'
import type { RealTimeCallApiEvents } from '../types'
import { AutoApplyTransformsConsumer } from '../AutoApplyTransformsConsumer'

export * from './VoiceClient'

/**
 * List of events for {@link Voice.Call}.
 */
export interface RealTimeVoiceApiEvents extends RealTimeCallApiEvents {}

type EmitterTransformsEvents = 'calling.call.received'

export interface Voice extends EmitterContract<RealTimeVoiceApiEvents> {
  /** @internal */
  _session: RealtimeClient
  dial(dialer: VoiceDialer): Promise<Call>
  createDialer(params?: CreateVoiceDialerParams): VoiceDialer
}

/** @internal */
class VoiceAPI extends AutoApplyTransformsConsumer<RealTimeVoiceApiEvents> {
  /** @internal */
  protected _eventsPrefix = 'calling' as const

  constructor(options: BaseComponentOptions<RealTimeVoiceApiEvents>) {
    super(options)

    this.setWorker('voiceCallReceiveWorker', {
      worker: voiceCallReceiveWorker,
    })

    this.attachWorkers()
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

  createDialer(params: CreateVoiceDialerParams = {}): VoiceDialer {
    const devices: VoiceDialer['devices'] = []

    const dialer: VoiceDialer = {
      ...params,
      devices,
      dialPhone(params) {
        devices.push([{ type: 'phone', ...params }])
        return dialer
      },
      dialSip(params) {
        devices.push([{ type: 'sip', ...params }])
        return dialer
      },
      inParallel(dialer) {
        const parallel = dialer.devices.map((row) => {
          if (Array.isArray(row)) {
            return row[0]
          }
          return row
        })
        devices.push(parallel)

        return dialer
      },
    }

    return dialer
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
