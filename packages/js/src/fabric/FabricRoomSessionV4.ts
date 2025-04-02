import { connect, OnAuthStateChange, selectors } from '@signalwire/core'
import { FabricRoomSessionEvents } from '../utils/interfaces'
import {
  FabricRoomSession,
  FabricRoomSessionConnection,
  FabricRoomSessionOptions,
} from './FabricRoomSession'
import { encodeAuthState } from './utils/authStateCodec'

export interface FabricRoomSessionOptionsV4 extends FabricRoomSessionOptions {
  onAuthStateChange?: OnAuthStateChange
}

export class FabricRoomSessionConnectionV4 extends FabricRoomSessionConnection {
  constructor(public options: FabricRoomSessionOptionsV4) {
    super(options)
  }

  public override async start() {
    return new Promise<void>(async (resolve, reject) => {
      try {
        this.once('room.subscribed', () => {
          resolve()

          if (this.options.onAuthStateChange) {
            const protocol = selectors.getProtocol(this.store.getState())
            const authState = selectors.getAuthorizationState(
              this.store.getState()
            )
            const callId = this.callId

            const encode = encodeAuthState({ authState, protocol, callId })
            this.options.onAuthStateChange(encode)
          }
        })

        await super.invite<FabricRoomSession>()
      } catch (error) {
        this.logger.error('WSClient call start', error)
        reject(error)
      }
    })
  }
}

/** @internal */
export const createFabricRoomSessionObjectV4 = (
  params: FabricRoomSessionOptionsV4
): FabricRoomSession => {
  const room = connect<
    FabricRoomSessionEvents,
    FabricRoomSessionConnectionV4,
    FabricRoomSession
  >({
    store: params.store,
    Component: FabricRoomSessionConnectionV4,
  })(params)

  return room
}
