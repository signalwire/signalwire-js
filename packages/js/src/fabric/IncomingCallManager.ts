import { BaseRoomSession } from '../BaseRoomSession'
import { RoomSession } from '../RoomSession'
import {
  CallOptions,
  IncomingCallHandlers,
  IncomingCallNotification,
  IncomingInvite,
} from './types'

export class IncomingCallManager {
  private _pendingInvites: Record<string, IncomingInvite> = {}
  private _handlers: IncomingCallHandlers = {}

  constructor(
    private _buildCallObject: (
      invite: IncomingInvite,
      params: CallOptions
    ) => BaseRoomSession<RoomSession>,
    private _executeReject: (callId: string, nodeId: string) => Promise<void>
  ) {}

  private _buildNotification(invite: IncomingInvite): IncomingCallNotification {
    const accept = async (params: CallOptions) => {
      return new Promise<BaseRoomSession<RoomSession>>((resolve, reject) => {
        delete this._pendingInvites[invite.callID]
        try {
          const call = this._buildCallObject(invite, params)
          //@ts-expect-error
          call.answer()

          resolve(call)
        } catch (e) {
          reject(e)
        }
      })
    }

    const reject = () => {
      delete this._pendingInvites[invite.callID]
      return this._executeReject(invite.callID, invite.nodeId)
    }

    return {
      invite: {
        details: invite,
        accept: (params) => accept(params),
        reject: () => reject(),
      },
    }
  }

  setNotificationHandlers(handlers: IncomingCallHandlers) {
    this._handlers.all = handlers.all
    if (
      (handlers.pushNotification &&
        this._handlers.all != handlers.pushNotification) ||
      !handlers.pushNotification
    ) {
      this._handlers.pushNotification = handlers.pushNotification
    }
    if (
      (handlers.websocket && this._handlers.all != handlers.websocket) ||
      !handlers.websocket
    ) {
      this._handlers.websocket = handlers.websocket
    }
  }

  handleIncomingInvite(incomingInvite: IncomingInvite) {
    if (incomingInvite.callID in this._pendingInvites) {
      console.log(
        `skiping nottification for pending invite to callID: ${incomingInvite.callID}`
      )
      return
    }
    this._pendingInvites[incomingInvite.callID] = incomingInvite

    if (!(this._handlers.all || this._handlers[incomingInvite.source])) {
      console.log('skiping nottification no listeners:')
      return
    }

    const notification = this._buildNotification(incomingInvite)

    this._handlers.all?.(notification)
    const handler = this._handlers[incomingInvite.source]
    handler?.(notification)
  }
}
