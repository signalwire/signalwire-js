import { AuthError, ClientEvents } from '@signalwire/core'

export interface SWClientSessionListeners {
  onConnected?: () => void
  onDisconnected?: () => void
  onReconnecting?: () => void
  onAuthError?: (error: AuthError) => void
}

export interface SWClientOptions {
  host?: string
  project: string
  token: string
  logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent'
  debug?: { logWsTraffic?: boolean }
  listen?: SWClientSessionListeners
}

 type ValidateEventMap<
   T extends Record<
     keyof Required<SWClientSessionListeners>,
     keyof ClientEvents
   >
 > = T

 export type SessionListenersEventMap = ValidateEventMap<{
   onConnected: 'session.connected'
   onDisconnected: 'session.disconnected'
   onReconnecting: 'session.reconnecting'
   onAuthError: 'session.auth_error'
 }>
