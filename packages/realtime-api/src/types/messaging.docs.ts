import { MessageContract } from '../messaging/Message'

export interface MessagingClientApiEventsDocs {
  'message.received': (message: MessageContract) => void

  'message.updated': (message: MessageContract) => void
}
