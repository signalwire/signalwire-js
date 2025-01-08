import { FabricRoomSession } from './FabricRoomSession'
import {
  CallParams,
  IncomingCallHandlers,
  IncomingCallNotification,
  IncomingInvite,
  IncomingInviteWithSource,
} from './types'
import { WSClient } from './WSClient'

interface IncomingCallManagerOptions {
  client: WSClient
  buildInboundCall: WSClient['buildInboundCall']
  executeVertoBye: WSClient['executeVertoBye']
}

export class IncomingCallManager {
  private _client: WSClient
  private _pendingInvites: Record<string, IncomingInvite> = {}
  private _handlers: IncomingCallHandlers = {}

  constructor(private options: IncomingCallManagerOptions) {
    this._client = options.client
  }

  private _buildNotification(invite: IncomingInvite): IncomingCallNotification {
    const accept = async (params: CallParams) => {
      return new Promise<FabricRoomSession>((resolve, reject) => {
        delete this._pendingInvites[invite.callID]
        try {
          const call = this.options.buildInboundCall(invite, params)
          call.answer()

          resolve(call)
        } catch (e) {
          reject(e)
        }
      })
    }

    const reject = () => {
      delete this._pendingInvites[invite.callID]
      return this.options.executeVertoBye(invite.callID, invite.nodeId)
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

  handleIncomingInvite(incomingInvite: IncomingInviteWithSource) {
    if (incomingInvite.callID in this._pendingInvites) {
      this._client.logger.debug(
        `skiping nottification for pending invite to callID: ${incomingInvite.callID}`
      )
      return
    }
    this._pendingInvites[incomingInvite.callID] = incomingInvite

    if (!(this._handlers.all || this._handlers[incomingInvite.source])) {
      this._client.logger.warn('Skiping nottification due to no listeners')
      return
    }

    const notification = this._buildNotification(incomingInvite)

    this._handlers.all?.(notification)
    const handler = this._handlers[incomingInvite.source]
    handler?.(notification)
  }
}
