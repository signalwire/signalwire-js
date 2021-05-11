import { Saga } from '@redux-saga/types'
import { PayloadAction } from '@reduxjs/toolkit'
import {
  JSONRPCResponse,
  SessionAuthError,
  SessionAuthStatus,
  SocketStatus,
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
  state?: string
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
  socketStatus: SocketStatus
}

export interface SDKState {
  components: ComponentState
  session: SessionState
}

export type GetDefaultSagas = () => Saga[]

export interface ExecuteActionParams {
  requestId?: string
  componentId?: string
  method: string
  params: Record<string, any>
}
