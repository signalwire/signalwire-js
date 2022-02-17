import type { EventEmitter } from '@signalwire/core'

import LegacyTasking from '@signalwire/node/dist/common/src/relay/tasking/Tasking'

export class Tasking extends LegacyTasking {
  store: any
  emitter: EventEmitter

  constructor(public session: any, public opts: any) {
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

  private _buildContextReceiveEventName(context: string) {
    return `${this.session.relayProtocol}:${this._ctxReceiveUniqueId(context)}`
  }

  onTaskingReceive(params: any) {
    const { context, message } = params
    const eventName = this._buildContextReceiveEventName(context)
    this.emitter.emit(eventName, message)
  }
}
