import type { EventEmitter } from '@signalwire/core'
/**
 * Importing Messaging and Message objects from the V2 Node.js SDK
 */
import LegacyMessaging from '@signalwire/node/dist/common/src/relay/messaging/Messaging'
import LegacyMessage from '@signalwire/node/dist/common/src/relay/messaging/Message'

export class Messaging extends LegacyMessaging {
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

  async onStateChange(contexts: string[], handler: EventEmitter.ListenerFn) {
    contexts.forEach((context) => {
      const eventName = this._buildContextStateEventName(context)
      console.log('Adding to EE', eventName)
      this.emitter.on(eventName, handler)
    })
    return true
  }

  private _buildContextStateEventName(context: string) {
    return `${this.session.relayProtocol}:${this._ctxStateUniqueId(context)}`
  }

  private _buildContextReceiveEventName(context: string) {
    return `${this.session.relayProtocol}:${this._ctxReceiveUniqueId(context)}`
  }

  onMessagingReceive(params: any) {
    const message = new LegacyMessage(params)
    const eventName = this._buildContextReceiveEventName(message.context)
    this.emitter.emit(eventName, message)
  }

  onMessagingState(params: any) {
    const message = new LegacyMessage(params)
    const eventName = this._buildContextStateEventName(message.context)
    this.emitter.emit(eventName, message)
  }
}
