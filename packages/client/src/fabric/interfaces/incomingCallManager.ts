import { UnifiedCommunicationSession } from '../UnifiedCommunicationSession'
import { CallParams } from './wsClient'

export type IncomingInviteSource = 'websocket' | 'pushNotification'

export interface IncomingInvite {
  callID: string
  sdp: string
  caller_id_name: string
  caller_id_number: string
  callee_id_name: string
  callee_id_number: string
  display_direction: string
  nodeId: string
}

export interface IncomingInviteWithSource extends IncomingInvite {
  source: IncomingInviteSource
}

export interface IncomingCallNotification {
  invite: {
    details: IncomingInvite
    accept: (param: CallParams) => Promise<UnifiedCommunicationSession>
    reject: () => Promise<void>
  }
}
export type IncomingCallHandler = (
  notification: IncomingCallNotification
) => void

export interface IncomingCallHandlers {
  all?: IncomingCallHandler
  pushNotification?: IncomingCallHandler
  websocket?: IncomingCallHandler
}
