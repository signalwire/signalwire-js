import { getLogger } from '@signalwire/core'
import { RelayClient, RelayClientOptions } from './RelayClient'
// import { IRelayConsumerParams } from '../../../common/src/util/interfaces'
// import Receive from '../../../common/src/services/Receive'

interface RelayConsumerOptions extends RelayClientOptions {
  onIncomingCall?: (call: any) => void
  onIncomingMessage?: (message: any) => void
  onMessageStateChange?: (message: any) => void
  onTask?: (task: any) => void
  setup?: (consumer: RelayConsumer) => void
  ready?: (consumer: RelayConsumer) => void
  teardown?: (consumer: RelayConsumer) => void
}

export class RelayConsumer {
  // FIXME: optionals
  host?: string
  project?: string
  token: string
  contexts: string[] = []
  // FIXME: typings
  onIncomingCall?: (call: any) => void
  onIncomingMessage?: (message: any) => void
  onMessageStateChange?: (message: any) => void
  onTask?: (task: any) => void
  setup?: (consumer: RelayConsumer) => void
  ready?: (consumer: RelayConsumer) => void

  public client: RelayClient

  constructor(params: RelayConsumerOptions) {
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
    this.host = host
    this.project = project
    this.token = token
    this.contexts = contexts
    if (typeof onIncomingCall === 'function') {
      this.onIncomingCall = onIncomingCall.bind(this)
    }
    if (typeof onIncomingMessage === 'function') {
      this.onIncomingMessage = onIncomingMessage.bind(this)
    }
    if (typeof onMessageStateChange === 'function') {
      this.onMessageStateChange = onMessageStateChange.bind(this)
    }
    if (typeof onTask === 'function') {
      this.onTask = onTask.bind(this)
    }
    if (typeof setup === 'function') {
      this.setup = setup.bind(this)
    }
    if (typeof ready === 'function') {
      this.ready = ready.bind(this)
    }
    if (typeof teardown === 'function') {
      process.on('exit', () => teardown(this))
    }
  }

  protected get logger() {
    return getLogger()
  }

  async run() {
    if (typeof this.setup === 'function') {
      this.setup(this)
    }
    const { host, project, token, contexts } = this
    if (!project || !token || !contexts.length) {
      this.logger.error('"project", "token" and "contexts" are required!')
      return
    }
    this.client = new RelayClient({
      host,
      project,
      token,
      contexts,
      debug: {
        logWsTraffic: true,
      },
    })

    if (this.onTask) {
      // FIXME: review event names
      this.client.tasking.on('queuing.relay.tasks', this.onTask)
    }

    // if (this.onIncomingCall) {
    //   promises.push(
    //     client.calling.onReceive(this.contexts, this.onIncomingCall)
    //   )
    // }
    if (this.onIncomingMessage) {
      this.client.messaging.on('messaging.state', this.onIncomingMessage)
    }
    if (this.onMessageStateChange) {
      this.client.messaging.on('messaging.receive', this.onMessageStateChange)
    }

    await this.client.connect()

    if (this.ready) {
      this.ready(this)
    }
  }
}
