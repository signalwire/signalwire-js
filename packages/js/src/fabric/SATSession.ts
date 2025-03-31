import {
  asyncRetry,
  BaseJWTSession,
  getLogger,
  increasingDelay,
  JSONRPCRequest,
  JSONRPCResponse,
  RPCConnect,
  RPCConnectParams,
  RPCReauthenticate,
  RPCReauthenticateParams,
  SATAuthorization,
  SessionOptions,
  SwAuthorizationState,
  UNIFIED_CONNECT_VERSION,
} from '@signalwire/core'
import { JWTHeader } from '../JWTSession'
import { decodeAuthState, encodeAuthState } from './utils/helpers'
import jwtDecode from 'jwt-decode'
import { SwCloseEvent } from '../utils/CloseEvent'

export interface ApiRequestRetriesOptions {
  /** increment step for each retry delay */
  apiRequestRetriesDelayIncrement: number
  /** initial retry delay */
  apiRequestRetriesDelay: number
  /** max API request retry, set to 0 disable retries */
  maxApiRequestRetries: number
}
export type SATSessionOptions = SessionOptions & ApiRequestRetriesOptions

/**
 * SAT Session is for the Call Fabric SDK
 */
export class SATSession extends BaseJWTSession {
  public connectVersion = UNIFIED_CONNECT_VERSION
  public WebSocketConstructor = WebSocket
  public CloseEventConstructor = SwCloseEvent
  public agent = process.env.SDK_PKG_AGENT!

  constructor(public options: SATSessionOptions) {
    let decodedJwt: JWTHeader = {}
    try {
      decodedJwt = jwtDecode(options.token, { header: true })
    } catch (e) {
      getLogger().debug('[SATSession] error decoding the JWT')
    }

    super({
      ...options,
      host: decodedJwt?.ch || options.host,
    })
  }

  override get signature() {
    if (this._rpcConnectResult) {
      const { authorization } = this._rpcConnectResult
      return (authorization as SATAuthorization).jti
    }
    return undefined
  }

  async onSwAuthorizationState(state: SwAuthorizationState) {
    if (this.options.onAuthStateChange) {
      const encoded = encodeAuthState({
        authState: state,
        protocol: this.relayProtocol,
      })
      this.options.onAuthStateChange(encoded)
    }
  }

  /**
   * Authenticate with the SignalWire Network using SAT
   * @return Promise<void>
   */
  override async authenticate() {
    let authState: string | undefined
    let protocol: string | undefined

    if (this.options.authState?.length) {
      const decoded = decodeAuthState(this.options.authState)
      authState = decoded.authState
      protocol = decoded.protocol
    }

    const params: RPCConnectParams = {
      ...this._connectParams,
      authentication: {
        jwt_token: this.options.token,
      },
      ...(authState && { authorization_state: authState }),
      ...(protocol && { protocol }),
    }

    try {
      this._rpcConnectResult = await this.execute(RPCConnect(params))
    } catch (error) {
      this.logger.debug('SATSession authenticate error', error)
      throw error
    }
  }

  /**
   * Reauthenticate with the SignalWire Network using a newer SAT.
   * If the session has expired, this will reconnect it.
   * @return Promise<void>
   */
  override async reauthenticate() {
    this.logger.debug('Session Reauthenticate', {
      ready: this.ready,
      expired: this.expired,
    })
    if (!this.ready || this.expired) {
      return this.connect()
    }

    const params: RPCReauthenticateParams = {
      project: this._rpcConnectResult.authorization.project_id,
      jwt_token: this.options.token,
    }

    try {
      const reauthResponse = await this.execute(RPCReauthenticate(params))

      this._rpcConnectResult = {
        ...this._rpcConnectResult,
        ...reauthResponse,
      }
    } catch (error) {
      this.logger.debug('Session Reauthenticate Failed', error)
      throw error
    }
  }

  override async execute(msg: JSONRPCRequest | JSONRPCResponse): Promise<any> {
    return asyncRetry({
      asyncCallable: () => super.execute(msg),
      maxRetries: this.options.maxApiRequestRetries,
      delayFn: increasingDelay({
        initialDelay: this.options.apiRequestRetriesDelay,
        variation: this.options.apiRequestRetriesDelayIncrement,
      }),
      expectedErrorHandler: (error) => {
        if (error?.message?.startsWith('Authentication failed')) {
          // is expected to be handle by the app developer, skipping retries
          return true
        }
        return false
      },
    })
  }
}
