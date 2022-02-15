import { getLogger } from '@signalwire/core'
import { RelayClient } from './RelayClient'

const isFunction = (t: any): t is Function => typeof t === 'function'

interface IRelayConsumerParams {
  host?: string
  project: string
  token: string
  contexts?: string[]
  onIncomingCall?: Function
  onIncomingMessage?: Function
  onMessageStateChange?: Function
  onTask?: Function
  setup?: Function
  ready?: Function
  teardown?: Function
}

export class RelayConsumer {
  host: string
  project: string
  token: string
  contexts: string[] = []
  onIncomingCall: Function
  onIncomingMessage: Function
  onMessageStateChange: Function
  onTask: Function
  setup: Function
  ready: Function
  teardown: Function

  public client: any

  constructor(params: IRelayConsumerParams) {
    const {
      host,
      project,
      token,
      contexts = [],
      onIncomingCall,
      onIncomingMessage,
      onMessageStateChange,
      onTask,
      setup,
      ready,
      teardown,
    } = params

    this.host = host ?? ''
    this.project = project
    this.token = token
    this.contexts = contexts
    if (isFunction(onIncomingCall)) {
      this.onIncomingCall = onIncomingCall.bind(this)
    }
    if (isFunction(onIncomingMessage)) {
      this.onIncomingMessage = onIncomingMessage.bind(this)
    }
    if (isFunction(onMessageStateChange)) {
      this.onMessageStateChange = onMessageStateChange.bind(this)
    }
    if (isFunction(onTask)) {
      this.onTask = onTask.bind(this)
    }
    if (isFunction(setup)) {
      this.setup = setup.bind(this)
    }
    if (isFunction(ready)) {
      this.ready = ready.bind(this)
    }
    if (isFunction(teardown)) {
      process.on('exit', () => teardown(this))
    }
  }

  async run() {
    if (isFunction(this.setup)) {
      this.setup(this)
    }
    const { host, project, token, contexts } = this
    if (!project || !token || !contexts.length) {
      getLogger().error('"project", "token" and "contexts" are required!')
      return
    }

    this.client = new RelayClient({
      host,
      project,
      token,
      contexts,
      // logLevel: 'debug',
      debug: {
        // logWsTraffic: true,
      },
    })

    // @ts-expect-error
    getLogger().setLevel(getLogger().levels.INFO)

    try {
      await this.client.connect()

      if (this.onIncomingCall) {
        this.client.calling.onReceive(this.contexts, this.onIncomingCall)
      }
      if (this.onIncomingMessage) {
        this.client.messaging.onReceive(this.contexts, this.onIncomingMessage)
      }
      if (this.onMessageStateChange) {
        this.client.messaging.onStateChange(
          this.contexts,
          this.onMessageStateChange
        )
      }
      // if (this.onTask) {
      //   this.client.tasking.onReceive(this.contexts, this.onTask)
      // }

      if (isFunction(this.ready)) {
        this.ready(this)
      }
    } catch (error) {
      getLogger().error('RelayConsumer error:', error)
    }
  }
}
