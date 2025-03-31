import {
  asyncRetry,
  increasingDelay,
  JSONRPCRequest,
  JSONRPCResponse,
  RPCReauthenticate,
  RPCReauthenticateParams,
  SATAuthorization,
  SessionOptions,
  UNIFIED_CONNECT_VERSION,
} from '@signalwire/core'
import { JWTSession } from '../JWTSession'

export interface ApiRequestRetriesOptions {
  /** increment step for each retry delay */
  apiRequestRetriesDelayIncrement: number
  /** initial retry delay */
  apiRequestRetriesDelay: number
  /** max API request retry, set to 0 disable retries */
  maxApiRequestRetries: number;
}
export type SATSessionOptions = SessionOptions & ApiRequestRetriesOptions;
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
      asyncCallable: () => super.execute(msg),
      maxRetries: this.options.maxApiRequestRetries,
      delayFn: increasingDelay({
        initialDelay: this.options.apiRequestRetriesDelay,
        variation: this.options.apiRequestRetriesDelayIncrement
      }),
      expectedErrorHandler: (error) => {
        if(error.message?.startsWith('Authentication failed')) {
          // is expected to be handle by the app developer, skipping retries
          return  true
        }
        return false
      }
    })
  }
}
