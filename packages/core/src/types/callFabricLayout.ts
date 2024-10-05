import { InternalVideoLayout, LayoutChanged, SwEvent } from '..'

/**
 * ==========
 * ==========
 * Server-Side Events
 * ==========
 * ==========
 */

/**
 * 'layout.changed
 */
export interface CallFabricLayoutChangedEventParams {
  call_id: string
  member_id: string
  node_id: string
  room_session_id: string
  room_id: string
  layout: InternalVideoLayout
}

export interface CallFabricLayoutChangedEvent extends SwEvent {
  event_type: LayoutChanged
  params: CallFabricLayoutChangedEventParams
}

export type CallFabricLayoutEvent = CallFabricLayoutChangedEvent

export type CallFabricLayoutEventParams = CallFabricLayoutChangedEventParams
