import { selectors } from '@signalwire/core'
import { WSClientOptionsV4 } from './interfaces'
import { encodeAuthState } from './utils/authStateCodec'
import { createWSClientV4 } from './createWSClientV4'
import { WSClient } from './WSClient'
import { createFabricRoomSessionObjectV4 } from './FabricRoomSessionV4'

export class WSClientV4 extends WSClient {
  protected fabricRoomSessionCreator = createFabricRoomSessionObjectV4

  constructor(wsClientOptionsV4: WSClientOptionsV4) {
    super(wsClientOptionsV4, createWSClientV4)
  }

  get authState() {
    const protocol = this.select(selectors.getProtocol)
    const authState = this.select(selectors.getAuthorizationState)
    return encodeAuthState({ authState: authState, protocol })
  }
}
