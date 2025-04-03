import { createWSClientV4 } from './createWSClientV4'
import { WSClient } from './WSClient'
import { createFabricRoomSessionObjectV4 } from './FabricRoomSessionV4'
import { wsClientWorkerV4 } from './workers/wsClientWorkerV4'
import { DialParams, WSClientOptions } from './interfaces'
import { FabricRoomSession } from './FabricRoomSession'
import { decodeAuthState } from './utils/authStateCodec'

export class WSClientV4 extends WSClient {
  protected fabricRoomSessionCreator = createFabricRoomSessionObjectV4

  constructor(public wsClientOptions: WSClientOptions) {
    super(wsClientOptions, createWSClientV4)

    this.runWorker('wsClientWorkerV4', {
      worker: wsClientWorkerV4,
    })
  }

  public override async reattach(params: DialParams) {
    return new Promise<FabricRoomSession>(async (resolve, reject) => {
      try {
        if (!this.wsClientOptions.authState) {
          throw new Error(
            'No "authState" provided during the client initialization'
          )
        }

        const decoded = decodeAuthState(this.wsClientOptions.authState)
        if (!decoded.callId) {
          throw new Error('Invalid Call ID in authState')
        }

        const call = this.buildOutboundCall({
          ...params,
          attach: true,
          prevCallId: decoded.callId,
        })
        resolve(call)
      } catch (error) {
        this.logger.error('Unable to reattach a call', error)
        reject(error)
      }
    })
  }
}
