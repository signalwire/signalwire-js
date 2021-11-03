import { sessionStorage } from './utils/storage/'
import {
  RPCConnect,
  RPCConnectParams,
  RPCReauthenticate,
  RPCReauthenticateParams,
} from './RPCMessages'
import { SessionOptions } from './utils/interfaces'
import { BaseSession } from './BaseSession'

export class BaseJWTSession extends BaseSession {
  /**
   * Can be set a value different then zero
   * to force the JWT as expired within X seconds.
   * TODO: Remove this workaround.
   */
  private _expiredDiffSeconds = 0
  private _refreshTokenNotificationDiff = 120
  /**
   * Check the JWT expiration every 20seconds
   */
  private _checkTokenExpirationDelay = 20 * 1000
  private _checkTokenExpirationTimer: any = null

  constructor(public options: SessionOptions) {
    super(options)

    this._checkTokenExpiration = this._checkTokenExpiration.bind(this)
    this.reauthenticate = this.reauthenticate.bind(this)
  }

  get expiresAt() {
    return this?._rpcConnectResult?.authorization?.expires_at ?? 0
  }

  get expiresIn() {
    const now = Math.floor(Date.now() / 1000)
    return this.expiresAt - now
  }

  get expired() {
    return this.expiresIn <= this._expiredDiffSeconds
  }

  /**
   * Authenticate with the SignalWire Network
   * using JWT
   * @return Promise<void>
   */
  async authenticate() {
    const params: RPCConnectParams = {
      agent: this.agent,
      version: this.connectVersion,
      authentication: {
        jwt_token: this.options.token,
      },
    }

    if (this._relayProtocolIsValid()) {
      params.protocol = this.relayProtocol
    } else if (this.signature) {
      const prevProtocol = await sessionStorage.getItem(this.signature)
      if (prevProtocol) {
        params.protocol = prevProtocol
      }
    }

    this._rpcConnectResult = await this.execute(RPCConnect(params))
    this._checkTokenExpiration()
  }

  /**
   * Reauthenticate with the SignalWire Network
   * using a newer JWT. If the session has expired
   * will reconnect it.
   * @return Promise<void>
   */
  async reauthenticate() {
    if (this.expired) {
      return this.connect()
    }

    const params: RPCReauthenticateParams = {
      project: this._rpcConnectResult.authorization.project,
      jwt_token: this.options.token,
    }

    try {
      this._rpcConnectResult = await this.execute(RPCReauthenticate(params))
    } catch (error) {
      clearTimeout(this._checkTokenExpirationTimer)
      throw error
    }
  }

  /**
   * Set a timer to dispatch a notification when the JWT is going to expire.
   * @return void
   */
  protected _checkTokenExpiration() {
    if (!this.expiresAt) {
      return
    }
    if (this.expiresIn <= this._refreshTokenNotificationDiff) {
      if (this.options._onRefreshToken) {
        this.options._onRefreshToken()
      } else {
        this.logger.error('The token is going to expire!')
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
