import {
  CallingCallConnectEventParams,
  CallingCall,
  uuid,
} from '@signalwire/core'
import { Voice } from './Voice2'
import { ListenSubscriber } from '../ListenSubscriber'
import {
  RealTimeCallEvents,
  RealTimeCallListeners,
  RealtimeCallListenersEventsMapping,
} from '../types'

export interface CallOptions {
  voice: Voice
  payload: CallingCall
  connectPayload?: CallingCallConnectEventParams
}

export class Call extends ListenSubscriber<
  RealTimeCallListeners,
  RealTimeCallEvents
> {
  private __uuid: string
  private _peer: Call | undefined
  private _payload: CallingCall
  private _connectPayload: CallingCallConnectEventParams | undefined
  protected _eventMap: RealtimeCallListenersEventsMapping = {
    onStateChanged: 'call.state',
    onPlaybackStarted: 'playback.started',
    onPlaybackUpdated: 'playback.updated',
    onPlaybackFailed: 'playback.failed',
    onPlaybackEnded: 'playback.ended',
    onRecordingStarted: 'recording.started',
    onRecordingUpdated: 'recording.updated',
    onRecordingFailed: 'recording.failed',
    onRecordingEnded: 'recording.ended',
  }

  constructor(options: CallOptions) {
    super({ swClient: options.voice._sw })

    this.__uuid = uuid()
    this._payload = options.payload
    this._connectPayload = options.connectPayload

    if (options.voice.callListeners) {
      this.listen(options.voice.callListeners)
    }
  }

  /** Unique id for this voice call */
  get id() {
    return this._payload?.call_id
  }

  get callId() {
    return this._payload?.call_id
  }

  get state() {
    return this._payload?.call_state
  }

  get callState() {
    return this._payload?.call_state
  }

  get tag() {
    return this.__uuid
  }

  get nodeId() {
    return this._payload.node_id
  }

  get device() {
    return this._payload.device
  }

  /** The type of call. Only phone and sip are currently supported. */
  get type() {
    return this.device?.type ?? ''
  }

  /** The phone number that the call is coming from. */
  get from() {
    if (this.type === 'phone') {
      return (
        // @ts-expect-error
        (this.device?.params?.from_number || this.device?.params?.fromNumber) ??
        ''
      )
    }
    return (
      // @ts-expect-error
      this.device?.params?.from ?? ''
    )
  }

  /** The phone number you are attempting to call. */
  get to() {
    if (this.type === 'phone') {
      return (
        // @ts-expect-error
        (this.device?.params?.to_number || this.device?.params?.toNumber) ?? ''
      )
    }
    // @ts-expect-error
    return this.device?.params?.to ?? ''
  }

  get headers() {
    // @ts-expect-error
    return this.device?.params?.headers ?? []
  }

  get active() {
    return this.state === 'answered'
  }

  get connected() {
    return this.connectState === 'connected'
  }

  get direction() {
    return this._payload?.direction
  }

  get context() {
    return this._payload.context
  }

  get connectState() {
    return this._connectPayload?.connect_state
  }

  get peer() {
    return this._peer
  }

  /** @internal */
  set peer(callInstance: Call | undefined) {
    this._peer = callInstance
  }

  /** @internal */
  setPayload(payload: CallingCall) {
    this._payload = payload
  }

  /** @internal */
  setConnectPayload(payload: CallingCallConnectEventParams) {
    this._connectPayload = payload
  }

  /**
   * Answers the incoming call.
   *
   * @example
   *
   * ```js
   * voice.client.listen({
   *  topics: ['home'],
   *  onCallReceived: async (call) => {
   *    try {
   *      await call.answer()
   *      console.log('Inbound call answered')
   *    } catch (error) {
   *      console.error('Error answering inbound call', error)
   *    }
   *  }
   * })
   * ```
   */
  answer() {
    return new Promise<this>((resolve, reject) => {
      if (!this.callId || !this.nodeId) {
        reject(new Error(`Can't call answer() on a call without callId.`))
      }

      this.on('call.state', (params) => {
        if (params.state === 'answered') {
          resolve(this)
        } else if (params.state === 'ended') {
          reject(new Error('Failed to answer the call.'))
        }
      })

      this._client
        .execute({
          method: 'calling.answer',
          params: {
            node_id: this.nodeId,
            call_id: this.callId,
          },
        })
        .catch((e) => {
          reject(e)
        })
    })
  }
}
