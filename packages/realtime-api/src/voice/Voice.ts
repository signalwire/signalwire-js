import { connect, BaseComponentOptions, toExternalJSON } from '@signalwire/core'
import type {
  EmitterContract,
  EventTransform,
  CallingCallReceiveEventParams,
  VoiceDialer,
  VoiceCallDialPhoneMethodParams,
  VoiceCallDialSipMethodParams,
  VoicePlaylist,
  CreateVoicePlaylistParams,
} from '@signalwire/core'
import { RealtimeClient } from '../client/index'
import { createCallObject, Call } from './Call'
import { voiceCallReceiveWorker } from './workers'
import { createDialer } from './utils'
import type { RealTimeCallApiEvents } from '../types'
import { AutoApplyTransformsConsumer } from '../AutoApplyTransformsConsumer'

export * from './VoiceClient'
export { createDialer }
export { createPlaylist } from './utils'

/**
 * List of events for {@link Voice.Call}.
 */
export interface RealTimeVoiceApiEvents extends RealTimeCallApiEvents {}

type EmitterTransformsEvents = 'calling.call.received'

export interface Voice extends EmitterContract<RealTimeVoiceApiEvents> {
  /** @internal */
  _session: RealtimeClient
  dial(dialer: VoiceDialer): Promise<Call>
  dialPhone(params: VoiceCallDialPhoneMethodParams): Promise<Call>
  dialSip(params: VoiceCallDialSipMethodParams): Promise<Call>
  createPlaylist(params?: CreateVoicePlaylistParams): VoicePlaylist
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

  dialPhone(params: VoiceCallDialPhoneMethodParams) {
    const dialer = createDialer().addPhone(params)
    // dial is available through the VoiceClient Proxy
    // @ts-expect-error
    return this.dial(dialer)
  }

  dialSip(params: VoiceCallDialSipMethodParams) {
    const dialer = createDialer().addSip(params)
    // dial is available through the VoiceClient Proxy
    // @ts-expect-error
    return this.dial(dialer)
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
