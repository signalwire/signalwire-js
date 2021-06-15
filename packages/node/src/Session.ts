import { BaseSession } from '@signalwire/core'
import WebSocket from 'ws'

export class Session extends BaseSession {
  public WebSocketConstructor = WebSocket
}
