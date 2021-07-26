import { BaseJWTSession } from '@signalwire/core'

export class JWTSession extends BaseJWTSession {
  public WebSocketConstructor = WebSocket
  public agent = process.env.SDK_PKG_AGENT!
}
