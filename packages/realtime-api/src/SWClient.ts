import { createClient } from './client/createClient'
import type { Client } from './client/Client'
import { clientConnect } from './client/clientConnect'
import { Task } from './task/Task'
import { Messaging } from './messaging/Messaging'
import { PubSub } from './pubSub/PubSub'
import { Chat } from './chat/Chat'
import { Voice } from './voice/Voice'
import { Video } from './video/Video'
import {
  SessionListenersEventMap,
  SWClientOptions,
  SWClientSessionListeners,
} from './types'

export class SWClient {
  private _sessionEventMap: SessionListenersEventMap = {
    onConnected: 'session.connected',
    onDisconnected: 'session.disconnected',
    onReconnecting: 'session.reconnecting',
    onAuthError: 'session.auth_error',
    onAuthExpiring: 'session.expiring',
  } as const

  private _task: Task
  private _messaging: Messaging
  private _pubSub: PubSub
  private _chat: Chat
  private _voice: Voice
  private _video: Video

  /** @internal */
  _client: Client
  /** @internal */
  _userOptions: SWClientOptions

  constructor(options: SWClientOptions) {
    this._userOptions = options
    this._client = createClient(options)

    if (options.listen) {
      this._attachSessionListeners(options.listen)
    }
  }

  /**
   * @deprecated Access to internal client will be removed. Use namespace methods instead.
   * @internal
   */
  get client(): Client {
    return this._client
  }

  /**
   * @deprecated Access to userOptions will be removed.
   * @internal
   */
  get userOptions(): SWClientOptions {
    return this._userOptions
  }

  async connect() {
    await clientConnect(this._client)
  }

  disconnect() {
    return new Promise<void>((resolve) => {
      const { sessionEmitter } = this._client
      sessionEmitter.on('session.disconnected', resolve)

      this._client.disconnect()
    })
  }

  listen(listeners: SWClientSessionListeners): () => void {
    this._attachSessionListeners(listeners)
    return () => this._detachSessionListeners(listeners)
  }

  private _attachSessionListeners(listeners: SWClientSessionListeners) {
    const { sessionEmitter } = this._client
    Object.entries(listeners).forEach(([key, fn]) => {
      if (typeof fn === 'function') {
        const event =
          this._sessionEventMap[key as keyof SWClientSessionListeners]
        if (event) sessionEmitter.on(event, fn)
      }
    })
  }

  private _detachSessionListeners(listeners: SWClientSessionListeners) {
    const { sessionEmitter } = this._client
    Object.entries(listeners).forEach(([key, fn]) => {
      if (typeof fn === 'function') {
        const event =
          this._sessionEventMap[key as keyof SWClientSessionListeners]
        if (event) sessionEmitter.off(event, fn)
      }
    })
  }

  get task() {
    if (!this._task) {
      this._task = new Task(this)
    }
    return this._task
  }

  get messaging() {
    if (!this._messaging) {
      this._messaging = new Messaging(this)
    }
    return this._messaging
  }

  get pubSub() {
    if (!this._pubSub) {
      this._pubSub = new PubSub(this)
    }
    return this._pubSub
  }

  get chat() {
    if (!this._chat) {
      this._chat = new Chat(this)
    }
    return this._chat
  }

  get voice() {
    if (!this._voice) {
      this._voice = new Voice(this)
    }
    return this._voice
  }

  get video() {
    if (!this._video) {
      this._video = new Video(this)
    }
    return this._video
  }
}
