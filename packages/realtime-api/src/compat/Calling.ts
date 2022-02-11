import type { EventEmitter } from '@signalwire/core'

import LegacyCalling from '@signalwire/node/dist/common/src/relay/calling/Calling'
import LegacyCall from '@signalwire/node/dist/common/src/relay/calling/Call'

// @ts-expect-error
export class Calling extends LegacyCalling {
  store: any
  emitter: EventEmitter

  constructor(public session: any, public opts: any) {
    // TODO: Pass a patched-interface here
    super(session)

    this.store = opts.store
    this.emitter = opts.emitter
  }

  async onReceive(contexts: string[], handler: EventEmitter.ListenerFn) {
    contexts.forEach((context) => {
      const eventName = this._buildContextReceiveEventName(context)
      console.log('Adding to EE', eventName)
      this.emitter.on(eventName, handler)
    })
    return true
  }

  async onStateChange(contexts: string[], handler: EventEmitter.ListenerFn) {
    contexts.forEach((context) => {
      const eventName = `${this.session.relayProtocol}:${this._ctxStateUniqueId(
        context
      )}`
      console.log('Adding to EE', eventName)
      this.emitter.on(eventName, handler)
    })
    return true
  }

  // FIXME: Change _onReceive to "protected" in the v2 SDK
  public override _onReceive(params: any): void {
    // @ts-expect-error
    const call = new LegacyCall(this, params)
    const eventName = this._buildContextReceiveEventName(call.context)
    this.emitter.emit(eventName, call)
  }

  private _buildContextReceiveEventName(context: string) {
    return `${this.session.relayProtocol}:${this._ctxReceiveUniqueId(context)}`
  }
}
