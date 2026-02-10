import { SwEvent } from '.'
import { InternalVideoLayout, LayoutChanged } from './videoLayout'

/**
 * ==========
 * ==========
 * Server-Side Events
 * ==========
 * ==========
 */

/**
 * layout.changed
 */
export interface FabricLayoutChangedEventParams {
  room_id: string
  room_session_id: string
  layout: InternalVideoLayout
}

export interface FabricLayoutChangedEvent extends SwEvent {
  event_type: LayoutChanged
  params: FabricLayoutChangedEventParams
}

export type FabricLayoutEventNames = LayoutChanged

export type FabricLayoutEvent = FabricLayoutChangedEvent

export type FabricLayoutEventParams = FabricLayoutChangedEventParams
