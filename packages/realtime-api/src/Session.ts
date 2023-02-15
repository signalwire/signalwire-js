import { BaseSession, CloseEvent } from '@signalwire/core'
import WebSocket from 'ws'

export class Session extends BaseSession {
  public WebSocketConstructor = WebSocket
  public CloseEventConstructor = CloseEvent
  public agent = process.env.SDK_PKG_AGENT!
}
