import { BaseJWTSession } from '@signalwire/core'

export class JWTSession extends BaseJWTSession {
  public WebSocketConstructor = WebSocket
}
