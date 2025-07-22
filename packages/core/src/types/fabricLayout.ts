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
export interface UCallLayoutChangedEventParams {
  room_id: string
  room_session_id: string
  layout: InternalVideoLayout
}

export interface UCallLayoutChangedEvent extends SwEvent {
  event_type: LayoutChanged
  params: UCallLayoutChangedEventParams
}

export type UCallLayoutEventNames = LayoutChanged

export type UCallLayoutEvent = UCallLayoutChangedEvent

export type UCallLayoutEventParams = UCallLayoutChangedEventParams
