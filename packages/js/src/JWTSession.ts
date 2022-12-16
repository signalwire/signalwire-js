import jwtDecode from 'jwt-decode'
import {
  BaseJWTSession,
  getLogger,
  SessionOptions,
  SwAuthorizationState,
} from '@signalwire/core'

export class JWTSession extends BaseJWTSession {
  public WebSocketConstructor = WebSocket
  public agent = process.env.SDK_PKG_AGENT!

  constructor(public options: SessionOptions) {
    let decodedJwt
    try {
      decodedJwt = jwtDecode<{ ch?: string }>(options.token, { header: true })
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        getLogger().debug('[JWTSession] error decoding the JWT')
      }
    }

    super({
      ...options,
      host: options.host || decodedJwt?.ch,
    })
  }

  get allowHijack() {
    // @ts-expect-error
    return this.options._hijack
  }

  override async retrieveRelayProtocol() {
    if (!this.allowHijack) {
      return ''
    }

    const key = this.getProtocolSessionStorageKey()
    if (key) {
      this.logger.info('Hijacking: search protocol for', key)
      return window.sessionStorage.getItem(key) ?? ''
    }
    return ''
  }

  override async persistRelayProtocol() {
    if (!this.allowHijack) {
      return
    }

    const key = this.getProtocolSessionStorageKey()
    if (key) {
      this.logger.info('Hijacking: persist protocol', key, this.relayProtocol)
      window.sessionStorage.setItem(key, this.relayProtocol)
    }
  }

  protected override async retrieveSwAuthorizationState() {
    const key = this.getAuthStateSessionStorageKey()
    if (key) {
      return window.sessionStorage.getItem(key) ?? ''
    }
    return ''
  }

  protected override async persistSwAuthorizationState(
    state: SwAuthorizationState
  ) {
    if (!this.allowHijack) {
      return
    }

    const key = this.getAuthStateSessionStorageKey()
    if (key) {
      this.logger.info('Hijacking: persist auth state', key, state)
      window.sessionStorage.setItem(key, state)
    }
  }

  private getAuthStateSessionStorageKey() {
    return `as-${this.getSessionStorageKey()}`
  }

  private getProtocolSessionStorageKey() {
    return `pt-${this.getSessionStorageKey()}`
  }

  private getSessionStorageKey() {
    try {
      const jwtPayload = jwtDecode<{ r: string; ja: string }>(
        this.options.token
      )
      return `${jwtPayload?.r}-${jwtPayload?.ja}`
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        getLogger().error('[getSessionStorageKey] error decoding the JWT')
      }
      return ''
    }
  }
}
