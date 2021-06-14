import { BaseJWTSession } from '@signalwire/core'
import WebSocket from 'ws'
// @ts-ignore
// import WebSocket from 'faye-websocket'

export class JWTSession extends BaseJWTSession {
  // @ts-ignore
  public WebSocketConstructor = WebSocket
}
