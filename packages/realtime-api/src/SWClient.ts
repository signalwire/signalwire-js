import { createClient } from './client/createClient'
import type { Client } from './client/Client'
import { clientConnect } from './client/clientConnect'
import { Task } from './task/Task'
import { PubSub } from './pubSub/PubSub'

export interface SWClientOptions {
  host?: string
  project: string
  token: string
  logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent'
  debug?: {
    logWsTraffic?: boolean
  }
}

export class SWClient {
  private _task: Task
  private _pubSub: PubSub

  public userOptions: SWClientOptions
  public client: Client

  constructor(options: SWClientOptions) {
    this.userOptions = options
    this.client = createClient(options)
  }

  async connect() {
    await clientConnect(this.client)
  }

  disconnect() {
    this.client.disconnect()
  }

  get task() {
    if (!this._task) {
      this._task = new Task(this)
    }
    return this._task
  }

  get pubSub() {
    if (!this._pubSub) {
      this._pubSub = new PubSub(this)
    }
    return this._pubSub
  }
}
