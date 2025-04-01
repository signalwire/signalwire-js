import { connect } from '@signalwire/core'
import { FabricRoomSessionEvents } from '../utils/interfaces'
import {
  FabricRoomSession,
  FabricRoomSessionConnection,
  FabricRoomSessionOptions,
} from './FabricRoomSession'

export interface FabricRoomSessionV4 extends FabricRoomSession {}

export class FabricRoomSessionConnectionV4 extends FabricRoomSessionConnection {
  public override async start() {
    return new Promise<void>(async (resolve, reject) => {
      try {
        this.once('room.subscribed', () => {
          resolve()
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
  params: FabricRoomSessionOptions
): FabricRoomSession => {
  const room = connect<
    FabricRoomSessionEvents,
    FabricRoomSessionConnectionV4,
    FabricRoomSessionV4
  >({
    store: params.store,
    Component: FabricRoomSessionConnectionV4,
  })(params)

  return room
}
