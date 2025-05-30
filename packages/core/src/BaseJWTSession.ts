import {
  RPCConnect,
  RPCConnectParams,
  RPCReauthenticate,
  RPCReauthenticateParams,
} from './RPCMessages'
import { SessionOptions } from './utils/interfaces'
import { BaseSession } from './BaseSession'
import { authExpiringAction, reauthAction } from './redux/actions'
import { type SWCloseEvent, isSATAuth } from './utils'

export class BaseJWTSession extends BaseSession {
  /**
   * Can set a value different than zero to
   * force the JWT as expired within X seconds.
   * TODO: Remove this workaround.
   */
  private readonly _expiredDiffSeconds = 0
  private readonly _refreshTokenNotificationDiff = 120
  /**
   * Check the JWT expiration every 20seconds
   */
  private readonly _checkTokenExpirationDelay = 20 * 1000
  private _checkTokenExpirationTimer: any = null

  constructor(public options: SessionOptions) {
    super(options)

    this._checkTokenExpiration = this._checkTokenExpiration.bind(this)
    this.reauthenticate = this.reauthenticate.bind(this)
  }

  get expiresAt() {
    if (!this?._rpcConnectResult) {
      return 0
    }
    const { authorization } = this._rpcConnectResult
    const expiresAt =
      (isSATAuth(authorization)
        ? authorization.fabric_subscriber.expires_at
        : authorization?.expires_at) ?? 0
    if (typeof expiresAt === 'string') {
      const parsed = Date.parse(expiresAt)
      if (!isNaN(parsed)) {
        return Math.floor(parsed / 1000)
      }
    }
    return expiresAt
  }

  get expiresIn() {
    const now = Math.floor(Date.now() / 1000)
    return this.expiresAt - now
  }

  get expired() {
    return this.expiresAt > 0 && this.expiresIn <= this._expiredDiffSeconds
  }

  /**
   * Authenticate with the SignalWire Network
   * using JWT
   * @return Promise<void>
   */
  async authenticate() {
    const params: RPCConnectParams = {
      ...this._connectParams,
      authentication: {
        jwt_token: this.options.token,
      },
    }

    if (this._relayProtocolIsValid()) {
      params.protocol = this.relayProtocol
    } else {
      /**
       * TODO: Find out a better way to get the prevProtocol
       */
      const prevProtocol = await this.retrieveRelayProtocol()
      if (prevProtocol) {
        params.protocol = prevProtocol
      }
    }

    // Try to set authorization_state only if we have a valid protocol
    if (params.protocol) {
      const authorizationState = await this.retrieveSwAuthorizationState()
      if (authorizationState) {
        params.authorization_state = authorizationState
      }
    }

    try {
      this._rpcConnectResult = await this.execute(RPCConnect(params))
      await this.persistRelayProtocol()
      await this._checkTokenExpiration()
    } catch (error) {
      this.logger.debug('BaseJWTSession authenticate error', error)
      if (error.message === 'Requester validation failed') {
        // removed the persisted params to try again
        this.removeRelayProtocol()
        this.removeSwAuthorizationState()
        this.removePrevCallId()
        await this.authenticate()
        return
      }
      throw error
    }
  }

  async retrieveRelayProtocol() {
    // no-op
    return ''
  }

  async persistRelayProtocol() {
    // no-op
  }

  removeRelayProtocol() {
    // no-op
  }

  removeSwAuthorizationState() {
    // no-op
  }

  removePrevCallId() {
    // no-op
  }

  /**
   * Reauthenticate with the SignalWire Network
   * using a newer JWT. If the session has expired
   * will reconnect it.
   * @return Promise<void>
   */
  async reauthenticate() {
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
      this._rpcConnectResult = await this.execute(RPCReauthenticate(params))
    } catch (error) {
      clearTimeout(this._checkTokenExpirationTimer)
      throw error
    }
  }

  protected override _onSocketClose(event: SWCloseEvent) {
    clearTimeout(this._checkTokenExpirationTimer)
    super._onSocketClose(event)
  }

  /**
   * Set a timer to dispatch a notification when the JWT is going to expire.
   * @return void
   */
  protected async _checkTokenExpiration() {
    if (!this.expiresAt) {
      return
    }
    const refreshTokenFn = this.options.onRefreshToken
    if (this.expiresIn <= this._refreshTokenNotificationDiff) {
      this.dispatch(authExpiringAction())

      if (typeof refreshTokenFn === 'function') {
        try {
          const token = await refreshTokenFn()
          this.dispatch(reauthAction({ token }))
        } catch (error) {
          this.logger.error(error)
        }
      } else {
        this.logger.warn('The token is going to expire!')
      }
    }
    clearTimeout(this._checkTokenExpirationTimer)
    if (!this.expired) {
      this._checkTokenExpirationTimer = setTimeout(
        this._checkTokenExpiration,
        this._checkTokenExpirationDelay
      )
    }
  }
}
