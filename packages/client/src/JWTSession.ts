import jwtDecode from 'jwt-decode'
import {
  BaseJWTSession,
  getLogger,
  SessionOptions,
  SwAuthorizationState,
  type SWCloseEvent,
} from '@signalwire/core'
import { getStorage, sessionStorageManager } from './utils/storage'
import { SwCloseEvent } from './utils/CloseEvent'

type JWTHeader = { ch?: string; typ?: string }

export class JWTSession extends BaseJWTSession {
  public WebSocketConstructor = WebSocket
  public CloseEventConstructor = SwCloseEvent
  public agent = process.env.SDK_PKG_AGENT!

  private tokenTyp: string

  constructor(public options: SessionOptions) {
    let decodedJwt: JWTHeader = {}
    try {
      decodedJwt = jwtDecode(options.token, {
        header: true,
      })
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        getLogger().debug('[JWTSession] error decoding the JWT')
      }
    }

    super({
      ...options,
      host: decodedJwt?.ch || options.host,
    })
    this.tokenTyp = decodedJwt.typ ?? 'VRT'
  }

  get allowReattach() {
    // @ts-expect-error
    return this.options?.reattach !== false && (this.isVRT() || this.isSAT())
  }

  override async retrieveRelayProtocol() {
    if (!this.allowReattach) {
      return ''
    }

    const { protocolKey } = sessionStorageManager(this.options.token)
    if (protocolKey) {
      this.logger.trace('Search protocol for', protocolKey)
      return getStorage()?.getItem(protocolKey) ?? ''
    }
    return ''
  }

  override async persistRelayProtocol() {
    if (!this.allowReattach) {
      return
    }

    const { protocolKey } = sessionStorageManager(this.options.token)
    if (protocolKey) {
      this.logger.trace('Persist protocol', protocolKey, this.relayProtocol)
      getStorage()?.setItem(protocolKey, this.relayProtocol)
    }
  }

  override removeRelayProtocol() {
    const { protocolKey } = sessionStorageManager(this.options.token)
    if (protocolKey) {
      this.logger.debug('Remove protocol', protocolKey, this.relayProtocol)
      getStorage()?.removeItem(protocolKey)
    }
  }

  override removePrevCallId() {
    const { callIdKey } = sessionStorageManager(this.options.token)
    if (callIdKey) {
      this.logger.debug('Remove Call', callIdKey)
      getStorage()?.removeItem(callIdKey)
    }
  }

  protected override async retrieveSwAuthorizationState() {
    const { authStateKey } = sessionStorageManager(this.options.token)
    if (authStateKey) {
      return getStorage()?.getItem(authStateKey) ?? ''
    }
    return ''
  }

  protected override async persistSwAuthorizationState(
    state: SwAuthorizationState
  ) {
    if (!this.allowReattach) {
      return
    }

    const { authStateKey } = sessionStorageManager(this.options.token)
    if (authStateKey) {
      this.logger.trace('Persist auth state', authStateKey, state)
      getStorage()?.setItem(authStateKey, state)
    }
  }

  override removeSwAuthorizationState() {
    const { authStateKey } = sessionStorageManager(this.options.token)
    if (authStateKey) {
      this.logger.trace('Remove auth state', authStateKey)
      getStorage()?.removeItem(authStateKey)
    }
  }

  protected override _onSocketClose(event: SWCloseEvent) {
    if (this.status === 'disconnected') {
      const { protocolKey, authStateKey, callIdKey } = sessionStorageManager(
        this.options.token
      )
      this.logger.debug('Cleaning up storage')
      if (protocolKey) {
        this.logger.debug('Remove protocolKey', protocolKey)
        getStorage()?.removeItem(protocolKey)
      }
      if (authStateKey) {
        this.logger.debug('Remove authStateKey', authStateKey)
        getStorage()?.removeItem(authStateKey)
      }
      if (callIdKey) {
        this.logger.debug('Remove callIdKey', callIdKey)
        getStorage()?.removeItem(callIdKey)
      }
    }

    super._onSocketClose(event)
  }

  private isVRT() {
    return this.tokenTyp === 'VRT'
  }

  private isSAT() {
    return this.tokenTyp === 'SAT'
  }
}
