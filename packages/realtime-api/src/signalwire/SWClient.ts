import { createClient } from './client/createClient'
import type { Client } from '../client/Client'
import { clientConnect } from '../client/clientConnect'
import { Task } from './task/Task'
import type { ExecuteParams } from '@signalwire/core'

export interface SWClientOptions {
  host?: string
  project: string
  token: string
  logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent'
}

export class SWClient {
  private _task: Task

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

  addTopics(topics: string[]) {
    const executeParams: ExecuteParams = {
      method: 'signalwire.receive',
      params: {
        contexts: topics,
      },
    }
    return this.client.execute(executeParams)
  }

  removeTopics(topics: string[]) {
    const executeParams: ExecuteParams = {
      method: 'signalwire.unreceive',
      params: {
        contexts: topics,
      },
    }
    return this.client.execute(executeParams)
  }

  get task() {
    if (!this._task) {
      this._task = new Task(this)
    }
    return this._task
  }
}
