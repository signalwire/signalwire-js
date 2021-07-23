import { BaseSession } from '@signalwire/core'
import WebSocket from 'ws'
import { version } from '../package.json'

export class Session extends BaseSession {
  public WebSocketConstructor = WebSocket
  public agent = `Node.js SDK/${version}`
}
