import {
  RPCReauthenticate,
  RPCReauthenticateParams,
  SATAuthorization,
  SessionOptions,
  UNIFIED_CONNECT_VERSION,
} from '@signalwire/core'
import { JWTSession } from '../JWTSession'

export class SATSession extends JWTSession {
  public connectVersion = UNIFIED_CONNECT_VERSION

  constructor(public options: SessionOptions) {
    super(options)
  }

  get isReconnecting() {
    return !!this._rpcConnectResult
  }

  override get signature() {
    if (this._rpcConnectResult) {
      const { authorization } = this._rpcConnectResult
      return (authorization as SATAuthorization).jti
    }
    return undefined
  }

  override async retrieveRelayProtocol() {
    // FIXME: until we get the "reattach" working for CF, we should only hijack the protocol in a "reconnect"
    return this.isReconnecting ? super.retrieveRelayProtocol() : ''
  }

  /**
   * Reauthenticate with the SignalWire Network
   * using a newer SAT. If the session has expired
   * will reconnect it.
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

      // FIXME: The reauth API is not returning the `expires_at`
      // For now, we assume the same `expires_at` seconds for the newly passed token
      const now = Math.floor(Date.now() / 1000)
      const newExpiresAt = now + this._tokenDuration
      this._rpcConnectResult = {
        ...this._rpcConnectResult,
        ...reauthResponse,
      }
      ;(
        this._rpcConnectResult.authorization as SATAuthorization
      ).fabric_subscriber.expires_at = newExpiresAt
    } catch (error) {
      clearTimeout(this._checkTokenExpirationTimer)
      throw error
    }
  }
}
