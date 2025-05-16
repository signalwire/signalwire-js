import {
  asyncRetry,
  increasingDelay,
  JSONRPCRequest,
  JSONRPCResponse,
  RPCReauthenticate,
  RPCReauthenticateParams,
  SATAuthorization,
  UNIFIED_CONNECT_VERSION,
  isConnectRequest,
  getLogger,
  isVertoInvite,
  SYMBOL_EXECUTE_CONNECTION_CLOSED,
} from '@signalwire/core'
import { JWTSession } from '../JWTSession'
import { SATSessionOptions } from './interfaces'
/**
 * SAT Session is for the Call Fabric SDK
 */
export class SATSession extends JWTSession {
  public connectVersion = UNIFIED_CONNECT_VERSION

  constructor(public options: SATSessionOptions) {
    super(options)
  }

  override get signature() {
    if (this._rpcConnectResult) {
      const { authorization } = this._rpcConnectResult
      return (authorization as SATAuthorization).jti
    }
    return undefined
  }

  override async _checkTokenExpiration() {
    /**
     * noop
     *
     * The Call Fabric SDK does not attach any timer and
     * does not emit any events to inform the user about the token expiry.
     */
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
      throw error
    }
  }

  override async execute(msg: JSONRPCRequest | JSONRPCResponse): Promise<any> {
    return asyncRetry({
      asyncCallable: async () => {
        await this._waitConnected() // avoid queuing a retry
        return super.execute(msg)
      },
      maxRetries: this.options.maxApiRequestRetries,
      delayFn: increasingDelay({
        initialDelay: this.options.apiRequestRetriesDelay,
        variation: this.options.apiRequestRetriesDelayIncrement,
      }),
      expectedErrorHandler: (error) => {
        getLogger().warn(error)
        if (isConnectRequest(msg)) {
          // `signalwire.connect` retries are handle by the connection
          return true
        }
        if (isVertoInvite(msg) && error === SYMBOL_EXECUTE_CONNECTION_CLOSED) {
          // we can't retry verto.invites in the transport layer
          getLogger().debug('skip verto.invite retry on error:', error)
          return true
        }
        return false
      },
    })
  }
}
