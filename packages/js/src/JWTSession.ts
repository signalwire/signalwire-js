import jwtDecode from 'jwt-decode'
import {
  BaseJWTSession,
  getLogger,
  SessionOptions,
  SwAuthorizationState,
} from '@signalwire/core'
import { getStorage, CALL_ID } from './utils/storage'

export class JWTSession extends BaseJWTSession {
  public WebSocketConstructor = WebSocket
  public CloseEventConstructor = CloseEvent
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

  get allowReattach() {
    // @ts-expect-error
    return this.options.reattach
  }

  override async retrieveRelayProtocol() {
    if (!this.allowReattach) {
      return ''
    }

    const key = this.getProtocolSessionStorageKey()
    if (key) {
      this.logger.info('Hijacking: search protocol for', key)
      return getStorage()?.getItem(key) ?? ''
    }
    return ''
  }

  override async persistRelayProtocol() {
    if (!this.allowReattach) {
      return
    }

    const key = this.getProtocolSessionStorageKey()
    if (key) {
      this.logger.info('Hijacking: persist protocol', key, this.relayProtocol)
      getStorage()?.setItem(key, this.relayProtocol)
    }
  }

  protected override async retrieveSwAuthorizationState() {
    const key = this.getAuthStateSessionStorageKey()
    if (key) {
      return getStorage()?.getItem(key) ?? ''
    }
    return ''
  }

  protected override async persistSwAuthorizationState(
    state: SwAuthorizationState
  ) {
    if (!this.allowReattach) {
      return
    }

    const key = this.getAuthStateSessionStorageKey()
    if (key) {
      this.logger.info('Hijacking: persist auth state', key, state)
      getStorage()?.setItem(key, state)
    }
  }

  protected override _onSocketClose(event: CloseEvent) {
    if (this.status === 'unknown') {
      this.logger.info('Hijacking: invalid values - cleaning up storage')
      const protocolKey = this.getProtocolSessionStorageKey()
      if (protocolKey) {
        getStorage()?.removeItem(protocolKey)
      }
      const authStatekey = this.getAuthStateSessionStorageKey()
      if (authStatekey) {
        getStorage()?.removeItem(authStatekey)
      }
      // Remove also the previous callId
      getStorage()?.removeItem(CALL_ID)
    }

    super._onSocketClose(event)
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
      return `${jwtPayload?.r}`
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        getLogger().error('[getSessionStorageKey] error decoding the JWT')
      }
      return ''
    }
  }
}
