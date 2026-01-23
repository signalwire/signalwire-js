import { AuthError } from '@signalwire/core'

export interface SWClientSessionListeners {
  onConnected?: () => void
  onDisconnected?: () => void
  onReconnecting?: () => void
  onAuthError?: (error: AuthError) => void
  onAuthExpiring?: () => void
}

export interface SWClientOptions {
  host?: string
  project: string
  token: string
  logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent'
  debug?: { logWsTraffic?: boolean }
  listen?: SWClientSessionListeners
}
