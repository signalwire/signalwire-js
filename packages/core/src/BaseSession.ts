import {
  uuid,
  getLogger,
  checkWebSocketHost,
  timeoutPromise,
  parseRPCResponse,
  safeParseJson,
  isJSONRPCResponse,
} from './utils'
import { PayloadAction } from './redux'
import { DEFAULT_HOST, WebSocketState } from './utils/constants'
import {
  RPCConnect,
  RPCConnectParams,
  DEFAULT_CONNECT_VERSION,
  RPCDisconnectResponse,
  RPCPingResponse,
} from './RPCMessages'
import {
  SessionOptions,
  SessionRequestObject,
  RPCConnectResult,
  JSONRPCRequest,
  JSONRPCResponse,
  WebSocketAdapter,
  NodeSocketAdapter,
  WebSocketClient,
  SessionStatus,
} from './utils/interfaces'
import {
  authErrorAction,
  authSuccessAction,
  socketClosedAction,
  socketErrorAction,
  socketMessageAction,
} from './redux/actions'
import { sessionActions } from './redux/features/session/sessionSlice'

export const SW_SYMBOL = Symbol('BaseSession')

export class BaseSession {
  /** @internal */
  public __sw_symbol = SW_SYMBOL

  public uuid = uuid()
  public WebSocketConstructor: NodeSocketAdapter | WebSocketAdapter
  public agent: string
  public connectVersion = DEFAULT_CONNECT_VERSION
  public reauthenticate?(): Promise<void>

  protected _rpcConnectResult: RPCConnectResult

  private _requests = new Map<string, SessionRequestObject>()
  private _socket: WebSocketClient | null = null
  private _host: string = DEFAULT_HOST

  private _executeTimeoutMs = 10 * 1000
  private _executeTimeoutError = Symbol.for('sw-execute-timeout')
  private _executeQueue: Set<JSONRPCRequest | JSONRPCResponse> = new Set()

  private _checkPingDelay = 15 * 1000
  private _checkPingTimer: any = null
  private _status: SessionStatus = 'unknown'
  private wsOpenHandler: (event: Event) => void
  private wsCloseHandler: (event: CloseEvent) => void
  private wsErrorHandler: (event: Event) => void

  constructor(public options: SessionOptions) {
    const { host, logLevel = 'info' } = options
    if (host) {
      this._host = checkWebSocketHost(host)
    }

    if (logLevel) {
      /**
       * `setLevel` only makes sense when dealing with our
       * default logger. The error is expected because we
       * don't expose `setLevel` as part of our public
       * SDKLogger since there's no standard API across
       * loggers to do this.
       */
      // @ts-expect-error
      this.logger.setLevel?.(logLevel)
    }
    this._onSocketOpen = this._onSocketOpen.bind(this)
    this._onSocketError = this._onSocketError.bind(this)
    this._onSocketClose = this._onSocketClose.bind(this)
    this._onSocketMessage = this._onSocketMessage.bind(this)
    this.execute = this.execute.bind(this)
    this.connect = this.connect.bind(this)

    /** Listen on socket events once */
    this.wsOpenHandler = (event) => {
      this._socket?.removeEventListener('open', this.wsOpenHandler)
      this._onSocketOpen(event)
    }
    this.wsCloseHandler = (event) => {
      this._socket?.removeEventListener('close', this.wsCloseHandler)
      this._onSocketClose(event)
    }
    this.wsErrorHandler = (event) => {
      this._socket?.removeEventListener('error', this.wsErrorHandler)
      this._onSocketError(event)
    }
  }

  get host() {
    return this._host
  }

  get rpcConnectResult() {
    return this._rpcConnectResult
  }

  get relayProtocol() {
    return this._rpcConnectResult?.protocol ?? ''
  }

  get signature() {
    return this._rpcConnectResult?.authorization?.signature
  }

  protected get logger() {
    return getLogger()
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

  get idle() {
    return this._status === 'idle'
  }

  get ready() {
    return !Boolean(this.idle || !this.connected)
  }

  set token(token: string) {
    this.options.token = token
  }

  /**
   * Connect the websocket
   *
   * @return void
   */
  connect(): void {
    if (!this?.WebSocketConstructor) {
      throw new Error('Missing WebSocketConstructor')
    }
    /**
     * Return if already connecting or connected
     * This prevents issues if "connect()" is called multiple times.
     */
    if (this.connecting || this.connected) {
      this.logger.warn('Session already connected.')
      return
    }

    /** In case of reconnect: remove listeners and then destroy it */
    this._removeSocketListeners()
    this.destroySocket()
    this._clearCheckPingTimer()

    this._socket = this._createSocket()
    this._addSocketListeners()
  }

  /**
   * Allow children classes to override it.
   * @return WebSocket instance
   */
  protected _createSocket() {
    return new this.WebSocketConstructor(this._host)
  }

  /** Allow children classes to override it. */
  protected destroySocket() {
    if (this._socket) {
      this._socket.close()
      this._socket = null
    }
  }

  protected _addSocketListeners() {
    if (!this._socket) {
      return this.logger.debug('Invalid socket instance to add listeners')
    }
    this._removeSocketListeners()
    this._socket.addEventListener('open', this.wsOpenHandler)
    this._socket.addEventListener('close', this.wsCloseHandler)
    this._socket.addEventListener('error', this.wsErrorHandler)
    this._socket.addEventListener('message', this._onSocketMessage)
  }

  protected _removeSocketListeners() {
    if (!this._socket) {
      return this.logger.debug('Invalid socket instance to remove listeners')
    }
    this._socket.removeEventListener('open', this.wsOpenHandler)
    this._socket.removeEventListener('close', this.wsCloseHandler)
    this._socket.removeEventListener('error', this.wsErrorHandler)
    this._socket.removeEventListener('message', this._onSocketMessage)
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
      this.logger.debug('Session not connected or already in closing state.')
      return
    }

    this._clearCheckPingTimer()
    this._requests.clear()
    this._closeConnection('disconnected')
  }

  /**
   * Send a JSON object to the server.
   * @return Promise that will resolve/reject depending on the server response
   */
  execute(msg: JSONRPCRequest | JSONRPCResponse): Promise<any> {
    // In case of a response don't wait for a result
    let promise: Promise<unknown> = Promise.resolve()
    if ('params' in msg) {
      // This is a request so save the "id" to resolve the Promise later
      promise = new Promise((resolve, reject) => {
        this._requests.set(msg.id, { rpcRequest: msg, resolve, reject })
      })
    }

    if (!this.ready) {
      this._addToExecuteQueue(msg)
      this.connect()

      return promise
    }

    this._send(msg)

    return timeoutPromise(
      promise,
      this._executeTimeoutMs,
      this._executeTimeoutError
    ).catch((error) => {
      if (error === this._executeTimeoutError) {
        this.logger.error('Request Timeout', msg)
        if (this.status === 'disconnected') {
          return this.logger.debug(
            'Request failed because the session is disconnected',
            this.status,
            this._socket
          )
        }

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
    const params: RPCConnectParams = {
      agent: this.agent,
      version: this.connectVersion,
      authentication: {
        project: this.options.project,
        token: this.options.token,
      },
    }
    if (this._relayProtocolIsValid()) {
      params.protocol = this.relayProtocol
    }
    if (this.options.contexts?.length) {
      params.contexts = this.options.contexts
    }
    this._rpcConnectResult = await this.execute(RPCConnect(params))
  }

  protected async _onSocketOpen(event: Event) {
    this.logger.debug('_onSocketOpen', event.type)
    try {
      await this.authenticate()
      this._status = 'connected'
      this._flushExecuteQueue()
      this.dispatch(authSuccessAction())
    } catch (error) {
      this.logger.error('Auth Error', error)
      this.dispatch(authErrorAction({ error }))
    }
  }

  protected _onSocketError(event: Event) {
    this.logger.debug('_onSocketError', event)
    this.dispatch(socketErrorAction())
  }

  protected _onSocketClose(event: CloseEvent) {
    this.logger.debug('_onSocketClose', event.type, event.code, event.reason)
    // We're gonna have to revisit this logic once we have a
    // `disconnect` method in constructors like `Chat`. We
    // left it like this because multiple tests were failing
    // because of some race conditions.
    this._status =
      event.code == 1000 || event.code == 1002 ? 'disconnected' : 'reconnecting'
    this.dispatch(socketClosedAction())
    this._socket = null
  }

  protected _onSocketMessage(event: MessageEvent) {
    const payload = this.decode<JSONRPCRequest | JSONRPCResponse>(event.data)
    this.logger.wsTraffic({ type: 'recv', payload })

    if (isJSONRPCResponse(payload)) {
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

      return this.logger.warn('Unknown request for', payload)
    }

    switch (payload.method) {
      case 'signalwire.ping':
        return this._pingHandler(payload)
      case 'signalwire.disconnect': {
        /**
         * Set this._status = 'idle' because the server
         * will close the connection soon.
         */
        this.execute(RPCDisconnectResponse(payload.id))
          .catch((error) => {
            this.logger.error('SwDisconnect Error', error)
          })
          .finally(() => {
            this._status = 'idle'
          })
        break
      }
      default:
        // If it's not a response, trigger the dispatch.
        this.dispatch(socketMessageAction(payload))
        this._handleWebSocketMessage(payload)
    }
  }

  protected _handleWebSocketMessage(
    _payload: JSONRPCRequest | JSONRPCResponse
  ) {
    // no-op
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

  protected encode<T>(input: T): Parameters<WebSocketClient['send']>[0] {
    return JSON.stringify(input)
  }

  protected decode<T>(input: any): T {
    return safeParseJson(input)
  }

  private _send(msg: JSONRPCRequest | JSONRPCResponse) {
    this.logger.wsTraffic({ type: 'send', payload: msg })
    this._socket!.send(this.encode(msg))
  }

  private _addToExecuteQueue(msg: JSONRPCRequest | JSONRPCResponse) {
    this.logger.warn('Request queued waiting for session to reconnect', msg)
    this._executeQueue.add(msg)
  }

  private _flushExecuteQueue() {
    if (!this._executeQueue.size) {
      return
    }
    if (!this.ready) {
      this.logger.warn(`Session not ready to flush the queue.`)
      this._closeConnection('reconnecting')
      return
    }
    this.logger.debug(`${this._executeQueue.size} messages to flush`)
    this._executeQueue.forEach((msg) => {
      this._send(msg)
      this._executeQueue.delete(msg)
    })
    this._executeQueue.clear()
  }

  private _clearCheckPingTimer() {
    clearTimeout(this._checkPingTimer)
  }

  private async _pingHandler(payload: JSONRPCRequest) {
    this._clearCheckPingTimer()
    this._checkPingTimer = setTimeout(() => {
      // Possibly half-open connection so force close our side
      this.logger.debug('Timeout waiting for ping')
      this._closeConnection('reconnecting')
    }, this._checkPingDelay)

    await this.execute(RPCPingResponse(payload.id, payload?.params?.timestamp))
  }

  private _closeConnection(
    status: Extract<SessionStatus, 'reconnecting' | 'disconnected'>
  ) {
    this._clearCheckPingTimer()
    this.logger.debug('Close Connection')
    this._status = status
    this.dispatch(
      sessionActions.authStatus(
        status === 'disconnected' ? 'unauthorized' : 'unknown'
      )
    )
    this.destroySocket()
  }
}
