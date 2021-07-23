import { BaseJWTSession } from '@signalwire/core'
import { version } from '../package.json'

export class JWTSession extends BaseJWTSession {
  public WebSocketConstructor = WebSocket
  public agent = `JavaScript SDK/${version}`
}
