import { createWSClientV4 } from './createWSClientV4'
import { WSClient } from './WSClient'
import { createFabricRoomSessionObjectV4 } from './FabricRoomSessionV4'
import { wsClientWorkerV4 } from './workers/wsClientWorkerV4'
import { WSClientOptions } from './interfaces'

export class WSClientV4 extends WSClient {
  protected fabricRoomSessionCreator = createFabricRoomSessionObjectV4

  constructor(public wsClientOptions: WSClientOptions) {
    super(wsClientOptions, createWSClientV4)

    this.runWorker('wsClientWorkerV4', {
      worker: wsClientWorkerV4,
    })
  }
}
