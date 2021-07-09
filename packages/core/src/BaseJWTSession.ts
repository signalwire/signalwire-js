import { logger } from './utils/logger'
import { sessionStorage } from './utils/storage/'
import { BladeConnect, BladeConnectParams } from './RPCMessages'
import { SessionOptions } from './utils/interfaces'
import { BaseSession } from './BaseSession'

const PROTOCOL = 'protocol'

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
  }

  get expiresAt() {
    return this?._bladeConnectResult?.authorization?.expires_at ?? 0
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
    const params: BladeConnectParams = {
      authentication: {
        jwt_token: this.options.token,
      },
      params: {},
    }

    if (this._relayProtocolIsValid()) {
      params.params = params.params || {}
      params.params.protocol = this.relayProtocol
    } else {
      const prevProtocol = await sessionStorage.getItem(PROTOCOL)
      if (prevProtocol) {
        params.params = params.params || {}
        params.params.protocol = prevProtocol
      }
    }

    this._bladeConnectResult = await this.execute(BladeConnect(params))
    await sessionStorage.setItem(PROTOCOL, this.relayProtocol)
    this._checkTokenExpiration()
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
      logger.debug(
        'Your JWT is going to expire. Please refresh it to keep the session live.'
      )
      // TODO: check JWT expires_at and handle re-auth
      // trigger(SwEvent.Notification, { type: Notification.RefreshToken, session: this }, this.uuid, false)
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
