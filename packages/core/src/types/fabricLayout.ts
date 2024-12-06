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
export interface FabricLayoutChangedEventParams {
  call_id: string
  member_id: string
  node_id: string
  room_session_id: string
  room_id: string
  layout: InternalVideoLayout
}

export interface FabricLayoutChangedEvent extends SwEvent {
  event_type: LayoutChanged
  params: FabricLayoutChangedEventParams
}

export type FabricLayoutEvent = FabricLayoutChangedEvent

export type FabricLayoutEventParams = FabricLayoutChangedEventParams
