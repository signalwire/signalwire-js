import jwtDecode from 'jwt-decode'
import { BaseJWTSession, getLogger, SessionOptions } from '@signalwire/core'

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

    const roomName = this.getRoomNameFromJWT()
    if (roomName) {
      this.logger.info('Hijacking: search protocol for', roomName)
      return window.sessionStorage.getItem(roomName) ?? ''
    }
    return ''
  }

  override async persistRelayProtocol() {
    if (!this.allowHijack) {
      return
    }

    const roomName = this.getRoomNameFromJWT()
    if (roomName) {
      this.logger.info(
        'Hijacking: persist protocol',
        roomName,
        this.relayProtocol
      )
      window.sessionStorage.setItem(roomName, this.relayProtocol)
    }
  }

  private getRoomNameFromJWT() {
    try {
      const jwtPayload = jwtDecode<{ r: string }>(this.options.token)
      return jwtPayload?.r
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        getLogger().error('[getRoomNameFromJWT] error decoding the JWT')
      }
      return ''
    }
  }
}
