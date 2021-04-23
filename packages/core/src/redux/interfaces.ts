import { Saga } from '@redux-saga/types'
import { PayloadAction } from '@reduxjs/toolkit'
import { JSONRPCResponse } from '../utils/interfaces'

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
}

export interface Message extends SWComponent {
  state?: string
}

export type ReduxComponent = WebRTCCall | Message

export interface ComponentState {
  [key: string]: ReduxComponent
}

export interface SDKState {
  components: ComponentState
}

export type GetDefaultSagas = () => Saga[]

export interface ExecuteActionParams {
  requestId: string
  componentId: string
  method: string
  params: Record<string, any>
}
