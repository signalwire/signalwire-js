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
export interface ProgrammableCallsLayoutChangedEventParams {
  room_id: string
  room_session_id: string
  layout: InternalVideoLayout
}

export interface ProgrammableCallsLayoutChangedEvent extends SwEvent {
  event_type: LayoutChanged
  params: ProgrammableCallsLayoutChangedEventParams
}

export type ProgrammableCallsLayoutEventNames = LayoutChanged

export type ProgrammableCallsLayoutEvent = ProgrammableCallsLayoutChangedEvent

export type ProgrammableCallsLayoutEventParams =
  ProgrammableCallsLayoutChangedEventParams
