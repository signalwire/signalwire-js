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
        getLogger().error('[JWTSession] error decoding the JWT')
      }
    }

    super({
      ...options,
      host: decodedJwt?.ch || options.host,
    })
  }
}
