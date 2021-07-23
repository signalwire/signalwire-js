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
  WebSocketAdapter,
  WebSocketClient,
  SessionStatus,
} from './utils/interfaces'

import {
  checkWebSocketHost,
  timeoutPromise,
  parseRPCResponse,
  safeParseJson,
} from './utils'
import {
  closeConnectionAction,
  authErrorAction,
  authSuccessAction,
  socketClosedAction,
  socketErrorAction,
  socketMessageAction,
} from './redux/actions'
import { sessionActions } from './redux/features/session/sessionSlice'

export class BaseSession {
  public uuid = uuid()
  public sessionid = ''
  public WebSocketConstructor: WebSocketAdapter

  protected _bladeConnectResult: IBladeConnectResult

  private _requests = new Map<string, SessionRequestObject>()
  private _requestQueue: SessionRequestQueued[] = []
  private _socket: WebSocketClient | null = null
  private _host: string = DEFAULT_HOST

  private _executeTimeoutMs = 10 * 1000
  private _executeTimeoutError = Symbol.for('sw-execute-timeout')

  private _checkPingDelay = 15 * 1000
  private _checkPingTimer: any = null
  private _status: SessionStatus = 'unknown'

  constructor(public options: SessionOptions) {
    if (options.host) {
      this._host = checkWebSocketHost(options.host)
    }
    this._onSocketOpen = this._onSocketOpen.bind(this)
    this._onSocketError = this._onSocketError.bind(this)
    this._onSocketClose = this._onSocketClose.bind(this)
    this._onSocketMessage = this._onSocketMessage.bind(this)
    this.execute = this.execute.bind(this)
    this.connect = this.connect.bind(this)

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

  get status() {
    return this._status
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
    this._socket.addEventListener('open', this._onSocketOpen)
    this._socket.addEventListener('close', this._onSocketClose)
    this._socket.addEventListener('error', this._onSocketError)
    this._socket.addEventListener('message', this._onSocketMessage)
  }

  /**
   * Clear the Session and close the WS connection.
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

    clearTimeout(this._checkPingTimer)
    this._requestQueue = []
    this._requests.clear()
    this._closeConnection('disconnected')
  }

  /**
   * Send a JSON object to the server.
   * @return Promise that will resolve/reject depending on the server response
   */
  execute(msg: JSONRPCRequest | JSONRPCResponse): Promise<any> {
    if (this._status === 'idle' || !this.connected) {
      return new Promise((resolve) => this._requestQueue.push({ resolve, msg }))
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
    this._socket!.send(JSON.stringify(msg))

    return timeoutPromise(
      promise,
      this._executeTimeoutMs,
      this._executeTimeoutError
    ).catch((error) => {
      if (error === this._executeTimeoutError) {
        logger.error('Request Timeout', msg)
        // Possibly half-open connection so force close our side
        this._closeConnection('reconnecting')
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
    }
    if (this._relayProtocolIsValid()) {
      params.protocol = this.relayProtocol
    }
    this._bladeConnectResult = await this.execute(BladeConnect(params))
  }

  protected async _onSocketOpen(event: Event) {
    logger.debug('_onSocketOpen', event.type)
    try {
      await this.authenticate()
      this._emptyRequestQueue()
      this._status = 'connected'
      this.dispatch(authSuccessAction())
    } catch (error) {
      logger.error('Auth Error', error)
      this.dispatch(authErrorAction({ error }))
    }
  }

  protected _onSocketError(event: Event) {
    logger.debug('_onSocketError', event)
    this.dispatch(socketErrorAction())
  }

  protected _onSocketClose(event: CloseEvent) {
    logger.debug('_onSocketClose', event.type, event.code, event.reason)
    this._status =
      event.code >= 1006 && event.code <= 1014 ? 'reconnecting' : 'disconnected'
    this.dispatch(socketClosedAction())
    this._socket = null
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
         * Set this._status = 'idle' because the server
         * will close the connection soon.
         */
        this.execute(BladeDisconnectResponse(payload.id))
          .catch((error) => {
            logger.error('BladeDisconnect Error', error)
          })
          .finally(() => {
            this._status = 'idle'
          })
        break
      }
      default:
        // If it's not a response, trigger the dispatch.
        this.dispatch(socketMessageAction(payload))
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
      // Possibly half-open connection so force close our side
      this._closeConnection('reconnecting')
    }, this._checkPingDelay)

    await this.execute(
      BladePingResponse(payload.id, payload?.params?.timestamp)
    )
  }

  private _closeConnection(
    status: Extract<SessionStatus, 'reconnecting' | 'disconnected'>
  ) {
    this._status = status
    this.dispatch(sessionActions.authStatus('unknown'))
    this.dispatch(closeConnectionAction())
    if (this._socket) {
      this._socket.close()
      this._socket = null
    }
  }
}
