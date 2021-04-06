// import { v4 as uuidv4 } from 'uuid'
// import { logger } from './utils/logger'
import { sessionStorage } from './utils/storage/'
import { BladeConnect, BladeConnectParams } from './RPCMessages'
// import {} from './utils/interfaces'

import { Session } from './Session'

export class JWTSession extends Session {
  public WebSocketConstructor = WebSocket

  // constructor(public options: SessionOptions) {
  //   super(options)
  // }

  /**
   * Authenticate with the SignalWire Network
   * using JWT
   * @return Promise<void>
   */
  async authenticate() {
    try {
      const params: BladeConnectParams = {
        authentication: {
          project: this.options.project,
          jwt_token: this.options.token,
        },
        params: {},
      }

      if (this._relayProtocolIsValid()) {
        params.params.protocol = this.relayProtocol
      } else {
        const prevProtocol = await sessionStorage.getItem(this.signature)
        if (prevProtocol) {
          params.params.protocol = prevProtocol
        }
      }

      const response = await this.execute(BladeConnect(params))
      console.log('Response', response)
      // TODO: check JWT expires_at and handle re-auth
    } catch (error) {
      console.error('Auth Error', error)
    }
  }
}
