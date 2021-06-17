import { PayloadAction } from '@reduxjs/toolkit'
import {
  JSONRPCResponse,
  SessionAuthError,
  SessionAuthStatus,
  SessionStatus,
  BladeExecuteMethod,
  CallState,
} from '../utils/interfaces'

interface SWComponent {
  id: string
  responses?: Record<string, JSONRPCResponse>
  errors?: Record<
    string,
    { action: PayloadAction<any>; jsonrpc: JSONRPCResponse }
  >
}

export interface WebRTCCall extends SWComponent {
  state?: CallState
  remoteSDP?: string
  nodeId?: string
  roomId?: string
  roomSessionId?: string
  memberId?: string
  byeCause?: string
  byeCauseCode?: number
  redirectDestination?: string
}

export interface Message extends SWComponent {
  state?: string
}

export type ReduxComponent = WebRTCCall | Message

export interface ComponentState {
  byId: {
    [key: string]: ReduxComponent
  }
}

export interface SessionState {
  protocol: string
  iceServers?: RTCIceServer[]
  authStatus: SessionAuthStatus
  authError?: SessionAuthError
}

export interface SDKState {
  components: ComponentState
  session: SessionState
}

export interface ExecuteActionParams {
  requestId?: string
  componentId?: string
  method: BladeExecuteMethod
  params: Record<string, any>
}

export interface SocketCloseParams {
  code: number
  reason: string
}
