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
export interface CallLayoutChangedEventParams {
  room_id: string
  room_session_id: string
  layout: InternalVideoLayout
}

export interface CallLayoutChangedEvent extends SwEvent {
  event_type: LayoutChanged
  params: CallLayoutChangedEventParams
}

export type CallLayoutEventNames = LayoutChanged

export type CallLayoutEvent = CallLayoutChangedEvent

export type CallLayoutEventParams = CallLayoutChangedEventParams
