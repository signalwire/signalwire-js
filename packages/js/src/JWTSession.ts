import { BaseJWTSession } from '../../core/src/BaseJWTSession'

export class JWTSession extends BaseJWTSession {
  public WebSocketConstructor = WebSocket
}
