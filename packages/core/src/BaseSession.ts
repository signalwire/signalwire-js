import {
  uuid,
  getLogger,
  checkWebSocketHost,
  timeoutPromise,
  parseRPCResponse,
  safeParseJson,
  isJSONRPCResponse,
  SWCloseEvent,
  isConnectRequest,
} from './utils'
import {
  DEFAULT_HOST,
  SYMBOL_CONNECT_ERROR,
  SYMBOL_EXECUTE_CONNECTION_CLOSED,
  SYMBOL_EXECUTE_TIMEOUT,
  WebSocketState,
} from './utils/constants'
import {
  RPCConnect,
  RPCConnectParams,
  DEFAULT_CONNECT_VERSION,
  RPCDisconnectResponse,
  RPCPingResponse,
  RPCEventAckResponse,
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
  SessionAuthError,
  VideoAuthorization,
  ChatAuthorization,
} from './utils/interfaces'
import {
  authErrorAction,
  authSuccessAction,
  socketMessageAction,
  sessionDisconnectedAction,
  sessionReconnectingAction,
} from './redux/actions'
import { sessionActions } from './redux/features/session/sessionSlice'
import { SwAuthorizationState } from '.'
import { SessionChannel, SessionChannelAction } from './redux/interfaces'

export const SW_SYMBOL = Symbol('BaseSession')

const randomInt = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1) + min)
}
const reconnectDelay = () => {
  return randomInt(1, 4) * 1000
}

export class BaseSession {
  /** @internal */
  public __sw_symbol = SW_SYMBOL

  public uuid = uuid()
  public WebSocketConstructor: NodeSocketAdapter | WebSocketAdapter
  public CloseEventConstructor: typeof SWCloseEvent
  public agent: string
  public connectVersion = DEFAULT_CONNECT_VERSION
  public reauthenticate?(): Promise<void>

  protected _rpcConnectResult: RPCConnectResult

  private _requests = new Map<string, SessionRequestObject>()
  private _socket: WebSocketClient | null = null
  private _host: string = DEFAULT_HOST

  private _executeTimeoutMs = 10 * 1000
  private _executeTimeoutError = SYMBOL_EXECUTE_TIMEOUT
  private _executeQueue: Set<JSONRPCRequest | JSONRPCResponse> = new Set()
  private _swConnectError = SYMBOL_CONNECT_ERROR
  private _executeConnectionClosed = SYMBOL_EXECUTE_CONNECTION_CLOSED

  private _checkPingDelay = 15 * 1000
  private _checkPingTimer: any = null
  private _reconnectTimer: ReturnType<typeof setTimeout>
  private _status: SessionStatus = 'unknown'
  private _resolveWaitConnected: null | (() => void) = null
  private _sessionChannel: SessionChannel
  private wsOpenHandler: (event: Event) => void
  private wsCloseHandler: (event: SWCloseEvent) => void
  private wsErrorHandler: (event: Event) => void

  constructor(public options: SessionOptions) {
    const { host, logLevel = 'info', sessionChannel } = options

    if (host) {
      this._host = checkWebSocketHost(host)
    }

    if (sessionChannel) {
      this._sessionChannel = sessionChannel
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
    if (this._rpcConnectResult) {
      const { authorization } = this._rpcConnectResult
      return (authorization as VideoAuthorization | ChatAuthorization).signature
    }
    return undefined
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

  protected async _waitConnected() {
    return new Promise<void>((resolve) => {
      if (this.connected) {
        resolve()
      } else {
        this._resolveWaitConnected = resolve
      }
    })
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
    if (!this?.CloseEventConstructor) {
      throw new Error('Missing CloseEventConstructor')
    }
    this._clearTimers()
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

      /**
       * Since the real `close` event can be delayed by OS/Browser,
       * trigger it manually to to perform the cleanup.
       */
      this.wsCloseHandler(
        new this.CloseEventConstructor('close', {
          reason: 'Client-side closed',
        })
      )

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
  disconnect() {
    /**
     * Return if there is not a _socket instance or
     * if it's already in closing state.
     */
    if (!this._socket || this.closing) {
      this.logger.debug('Session not connected or already in closing state.')
      return
    }

    this._status = 'disconnecting'
    this._checkCurrentStatus()
  }

  /**
   * Send a JSON object to the server.
   * @return Promise that will resolve/reject depending on the server response
   */
  execute(msg: JSONRPCRequest | JSONRPCResponse): Promise<any> {
    if (this._status === 'disconnecting') {
      this.logger.warn(
        'Reject request because the session is disconnecting',
        msg
      )
      return Promise.reject({
        code: '400',
        message: 'The SDK session is disconnecting',
      })
    }
    if (this._status === 'disconnected') {
      return Promise.reject({
        code: '400',
        message: 'The SDK is disconnected',
      })
    }
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
      if (error === this._executeConnectionClosed) {
        throw this._executeConnectionClosed
      } else if (error === this._executeTimeoutError) {
        if (isConnectRequest(msg)) {
          throw this._swConnectError
        }
        this._checkCurrentStatus()
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

  protected get _connectParams(): RPCConnectParams {
    return {
      agent: this.agent,
      version: this.connectVersion,
      authentication: {
        project: this.options.project,
        token: this.options.token,
      },
    }
  }

  /**
   * Authenticate with the SignalWire Network
   * @return Promise<void>
   */
  async authenticate() {
    const params: RPCConnectParams = this._connectParams

    if (this._relayProtocolIsValid()) {
      params.protocol = this.relayProtocol
    }
    if (this.options.topics?.length) {
      params.contexts = this.options.topics
    } else if (this.options.contexts?.length) {
      params.contexts = this.options.contexts
    }
    this._rpcConnectResult = await this.execute(RPCConnect(params))
  }

  authError(error: SessionAuthError) {
    /** Ignore WS events after the auth error and just disconnect */
    this._removeSocketListeners()

    this.dispatch(authErrorAction({ error }))
  }

  forceClose() {
    this._removeSocketListeners()

    return this._closeConnection('reconnecting')
  }

  protected async _onSocketOpen(event: Event) {
    this.logger.debug('_onSocketOpen', event.type)
    try {
      // Reset to "unknown" in case of reconnect
      this._status = 'unknown'
      this._clearTimers()
      await this.authenticate()
      this._status = 'connected'
      this._resolveWaitConnected?.()
      this._flushExecuteQueue()
      this.dispatch(authSuccessAction())
    } catch (error) {
      if (
        error === this._swConnectError ||
        error === this._executeConnectionClosed
      ) {
        this.logger.debug(
          'Invalid connect or connection closed. Waiting for retry.'
        )
        return
      }

      this.logger.error('Auth Error', error)
      this.authError(error)
    }
  }

  protected _onSocketError(event: Event) {
    this.logger.debug('_onSocketError', event)
  }

  protected _onSocketClose(event: SWCloseEvent) {
    this.logger.debug('_onSocketClose', event.type, event.code, event.reason)
    if (this._status !== 'disconnected') {
      this._status = 'reconnecting'
      this.dispatch(sessionReconnectingAction())
      this._clearTimers()
      this._clearPendingRequests()
      this._reconnectTimer = setTimeout(() => {
        this.connect()
      }, reconnectDelay())
    }
    this._socket = null
  }

  private _clearTimers() {
    clearTimeout(this._reconnectTimer)
  }

  private _clearPendingRequests() {
    this.logger.debug('_clearPendingRequests', this._requests.size)
    this._requests.forEach(({ reject }) => {
      reject(this._executeConnectionClosed)
    })
    this._requests.clear()
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

        this._checkCurrentStatus()

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
        this._eventAcknowledgingHandler(payload).catch((error) =>
          this.logger.error('Event Acknowledging Error', error)
        )
        // If it's not a response, trigger the dispatch.
        this.dispatch(socketMessageAction(payload))
    }
  }

  public dispatch(_payload: SessionChannelAction) {
    if (!this._sessionChannel) {
      throw new Error('Session channel does not exist')
    }
    this._sessionChannel.put(_payload)
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

  async onSwAuthorizationState(state: SwAuthorizationState) {
    this.persistSwAuthorizationState(state)
  }

  protected async retrieveSwAuthorizationState() {
    // no-op : allow override
    return ''
  }

  protected async persistSwAuthorizationState(_: SwAuthorizationState) {
    // no-op : allow override
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

  private async _eventAcknowledgingHandler(
    payload: JSONRPCRequest
  ): Promise<void> {
    const { method, id } = payload
    if (method === 'signalwire.event') {
      return this.execute(RPCEventAckResponse(id))
    }
    return Promise.resolve()
  }

  /**
   * Do something based on the current `this._status`
   */
  private _checkCurrentStatus() {
    switch (this._status) {
      // Only close the WS connection if there are no pending requests
      case 'disconnecting':
        if (this._requests.size > 0) {
          return
        }
        this._requests.clear()
        this._closeConnection('disconnected')
        break
      case 'disconnected':
        // Will destroy the rootSaga too
        this.dispatch(sessionDisconnectedAction())
        break
      case 'reconnecting':
        /**
         * Since the real `close` event can be delayed by OS/Browser,
         * trigger it manually to start the reconnect process if required.
         */
        this.wsCloseHandler(
          new this.CloseEventConstructor('close', {
            reason: 'Client-side closed',
          })
        )
        break
    }
  }

  private _closeConnection(
    status: Extract<SessionStatus, 'reconnecting' | 'disconnected'>
  ) {
    this._clearCheckPingTimer()
    this.logger.debug('Close Connection:', status)
    this._status = status
    this.dispatch(
      sessionActions.authStatus(
        status === 'disconnected' ? 'unauthorized' : 'unknown'
      )
    )
    this._removeSocketListeners()
    this.destroySocket()
    this._checkCurrentStatus()
  }
}
