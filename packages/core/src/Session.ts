import { PayloadAction } from '@reduxjs/toolkit'
import { uuid, logger } from './utils'
import { BladeMethod, DEFAULT_HOST, WebSocketState } from './utils/constants'
import {
  BladeConnect,
  BladeConnectParams,
  BladeDisconnectResponse,
  BladePingResponse,
} from './RPCMessages'
import {
  SessionOptions,
  SessionRequestObject,
  SessionRequestQueued,
  IBladeConnectResult,
  JSONRPCRequest,
  JSONRPCResponse,
} from './utils/interfaces'

import {
  checkWebSocketHost,
  timeoutPromise,
  parseRPCResponse,
  safeParseJson,
} from './utils'
import {
  authError,
  authSuccess,
  socketClosed,
  socketError,
  socketMessage,
} from './redux/actions'

export class Session {
  public uuid = uuid()
  public sessionid = ''
  public WebSocketConstructor: typeof WebSocket

  protected _bladeConnectResult: IBladeConnectResult

  private _requests = new Map<string, SessionRequestObject>()
  private _requestQueue: SessionRequestQueued[] = []
  private _socket: WebSocket
  private _idle = true
  private _host: string = DEFAULT_HOST

  private _executeTimeoutMs = 10 * 1000
  private _executeTimeoutError = Symbol.for('sw-execute-timeout')

  private _checkPingDelay = 15 * 1000
  private _checkPingTimer: any = null

  // validateOptions(): boolean
  // dispatch(notification: any): void

  constructor(public options: SessionOptions) {
    // if (!this.validateOptions()) {
    //   throw new Error('Invalid init options')
    // }
    if (options.host) {
      this._host = checkWebSocketHost(options.host)
    }
    this._onSocketOpen = this._onSocketOpen.bind(this)
    this._onSocketError = this._onSocketError.bind(this)
    this._onSocketClose = this._onSocketClose.bind(this)
    this._onSocketMessage = this._onSocketMessage.bind(this)
    this.execute = this.execute.bind(this)

    this.logger.setLevel(this.logger.levels.INFO)
  }

  get bladeConnectResult() {
    return this._bladeConnectResult
  }

  get relayProtocol() {
    return this._bladeConnectResult?.result?.protocol ?? ''
  }

  get signature() {
    return this._bladeConnectResult?.authorization?.signature
  }

  get logger(): typeof logger {
    return logger
  }

  get connecting() {
    return this._socket?.readyState === WebSocketState.CONNECTING
  }

  get connected() {
    return this._socket?.readyState === WebSocketState.OPEN
  }

  get closing() {
    return this._socket?.readyState === WebSocketState.CLOSING
  }

  get closed() {
    return this._socket
      ? this._socket.readyState === WebSocketState.CLOSED
      : true
  }

  /**
   * Connect the websocket
   *
   * @return void
   */
  connect(): void {
    if (!this?.WebSocketConstructor) {
      logger.error('Missing WebSocketConstructor')
      return
    }
    /**
     * Return if there is already a _socket instance.
     * This prevents issues if "connect()" is called multiple times.
     */
    if (this._socket) {
      logger.warn('Session already connected.')
      return
    }
    this._socket = new this.WebSocketConstructor(this._host)
    this._socket.onopen = this._onSocketOpen
    this._socket.onclose = this._onSocketClose
    this._socket.onerror = this._onSocketError
    this._socket.onmessage = this._onSocketMessage
  }

  /**
   * Remove subscriptions and calls, close WS connection and remove all session listeners.
   * @return void
   */
  async disconnect() {
    /**
     * Return if there is not a _socket instance or
     * if it's already in closing state.
     */
    if (!this._socket || this.closing) {
      logger.warn('Session not connected or already in closing state.')
      return
    }

    this._socket.close()
    // @ts-ignore
    delete this._socket
    // clearTimeout(this._reconnectTimeout)
    // this.subscriptions.clear()
    // this._autoReconnect = false
    // this.relayProtocol = null
    // this._closeConnection()
    // await sessionStorage.removeItem(this.signature)
    // this._executeQueue = []
    // this._detachListeners()
    // this.off(SwEvent.Ready)
    // this.off(SwEvent.Notification)
    // this.off(SwEvent.Error)
  }

  /**
   * Send a JSON object to the server.
   * @return Promise that will resolve/reject depending on the server response
   */
  execute(msg: JSONRPCRequest | JSONRPCResponse): Promise<any> {
    if (this._idle) {
      return new Promise((resolve) => this._requestQueue.push({ resolve, msg }))
    }
    if (!this.connected) {
      return new Promise((resolve) => {
        this._requestQueue.push({ resolve, msg })
        this.connect()
      })
    }
    let promise: Promise<unknown>
    if ('params' in msg) {
      // This is a request so save the "id" to resolve the Promise later
      promise = new Promise((resolve, reject) => {
        this._requests.set(msg.id, { rpcRequest: msg, resolve, reject })
      })
    } else {
      // This is a response so don't wait for a result
      promise = Promise.resolve()
    }

    logger.debug('SEND: \n', JSON.stringify(msg, null, 2), '\n')
    this._socket.send(JSON.stringify(msg))

    return timeoutPromise(
      promise,
      this._executeTimeoutMs,
      this._executeTimeoutError
    ).catch((error) => {
      if (error === this._executeTimeoutError) {
        logger.error('Request Timeout', msg)
        // FIXME: Timeout so close/reconnect
        // this._closeConnection()
      } else {
        throw error
      }
    })
  }

  /**
   * Authenticate with the SignalWire Network
   * @return Promise<void>
   */
  async authenticate() {
    const params: BladeConnectParams = {
      authentication: {
        project: this.options.project,
        token: this.options.token,
      },
      params: {},
    }
    if (this._relayProtocolIsValid()) {
      params.params = params.params || {}
      params.params.protocol = this.relayProtocol
    }
    this._bladeConnectResult = await this.execute(BladeConnect(params))
  }

  protected async _onSocketOpen(event: Event) {
    logger.debug('_onSocketOpen', event)
    this._idle = false
    try {
      await this.authenticate()
      this._emptyRequestQueue()

      this.dispatch(authSuccess())
    } catch (error) {
      logger.error('Auth Error', error)
      this.dispatch(authError())
    }
  }

  protected _onSocketError(event: Event) {
    logger.debug('_onSocketError', event)
    this.dispatch(socketError())
  }

  protected _onSocketClose(event: CloseEvent) {
    logger.debug('_onSocketClose', event)
    this.dispatch(socketClosed())
    // @ts-ignore
    delete this._socket

    this.connect()
  }

  protected _onSocketMessage(event: MessageEvent) {
    const payload: any = safeParseJson(event.data)
    logger.debug('RECV: \n', JSON.stringify(payload, null, 2), '\n')
    const request = this._requests.get(payload.id)
    if (request) {
      const { rpcRequest, resolve, reject } = request
      this._requests.delete(payload.id)
      const { result, error } = parseRPCResponse({
        response: payload,
        request: rpcRequest,
      })
      return error ? reject(error) : resolve(result)
    }

    switch (payload.method) {
      case BladeMethod.Ping:
        return this._bladePingHandler(payload)
      case BladeMethod.Disconnect: {
        /**
         * Set _idle = true because the server
         * will close the connection soon.
         */
        this._idle = true
        this.execute(BladeDisconnectResponse(payload.id))
        break
      }
      default:
        // If it's not a response, trigger the dispatch.
        this.dispatch(socketMessage(payload))
    }
  }

  public dispatch(_payload: PayloadAction<any>) {
    throw new Error('Method not implemented')
  }

  /**
   * Check the current relayProtocol against the signature
   * to make sure is still valid.
   * @return boolean
   */
  protected _relayProtocolIsValid() {
    return (
      this.signature && this?.relayProtocol?.split('_')[1] === this.signature
    )
  }

  /**
   * Execute all the queued messages during the idle period.
   * @return void
   */
  private _emptyRequestQueue() {
    this._requestQueue.forEach(({ resolve, msg }) => {
      resolve(this.execute(msg))
    })
    this._requestQueue = []
  }

  private async _bladePingHandler(payload: JSONRPCRequest) {
    clearTimeout(this._checkPingTimer)
    this._checkPingTimer = setTimeout(() => {
      logger.error('No ping from remote.')
      // TODO: Close/Reconnect connection
    }, this._checkPingDelay)

    await this.execute(
      BladePingResponse(payload.id, payload?.params?.timestamp)
    )
  }
}
