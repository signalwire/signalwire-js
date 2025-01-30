import {
  RPCReauthenticate,
  RPCReauthenticateParams,
  SATAuthorization,
  SessionOptions,
  UNIFIED_CONNECT_VERSION,
} from '@signalwire/core'
import { JWTSession } from '../JWTSession'

/**
 * SAT Session is for the Call Fabric SDK
 */
export class SATSession extends JWTSession {
  public connectVersion = UNIFIED_CONNECT_VERSION

  constructor(public options: SessionOptions) {
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
}
