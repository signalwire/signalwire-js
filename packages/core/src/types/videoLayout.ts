import type { SwEvent } from '.'
import { VideoPosition } from '..'
import type { CamelToSnakeCase, ToInternalVideoEvent } from './utils'

export type LayoutChanged = 'layout.changed'
export type OnLayoutChanged = 'onLayoutChanged'

/**
 * List of public event names
 */
export type VideoLayoutEventNames = LayoutChanged

/**
 * List of public listener names
 */
export type VideoLayoutListenerNames = OnLayoutChanged

/**
 * List of internal events
 * @internal
 */
export type InternalVideoLayoutEventNames =
  ToInternalVideoEvent<VideoLayoutEventNames>

/**
 * Base Interface for a VideoLayout entity
 */
export interface VideoLayout {
  id: string
  name: string
  roomSessionId: string
  roomId: string
  layers: VideoLayoutLayer[]
}

export interface VideoLayoutLayer {
  memberId?: string
  y: number
  x: number
  height: number
  width: number
  layerIndex: number
  zIndex: number
  reservation: string
  position: VideoPosition
  playingFile: boolean
  visible: boolean
}

/**
 * VideoLayout entity for internal usage (converted to snake_case)
 * @internal
 */
export type InternalVideoLayoutLayer = {
  [K in keyof VideoLayoutLayer as CamelToSnakeCase<K>]: VideoLayoutLayer[K]
}
export type InternalVideoLayout = {
  [K in Exclude<
    keyof VideoLayout,
    'layers'
  > as CamelToSnakeCase<K>]: VideoLayout[K]
} & {
  layers: InternalVideoLayoutLayer[]
}

/**
 * ==========
 * ==========
 * Server-Side Events
 * ==========
 * ==========
 */

/**
 * 'video.layout.changed
 */
export interface VideoLayoutChangedEventParams {
  room_session_id: string
  room_id: string
  layout: InternalVideoLayout
}

export interface VideoLayoutChangedEvent extends SwEvent {
  event_type: ToInternalVideoEvent<LayoutChanged>
  params: VideoLayoutChangedEventParams
}

// prettier-ignore
export type VideoLayoutEvent =
  | VideoLayoutChangedEvent

// prettier-ignore
export type VideoLayoutEventParams =
  | VideoLayoutChangedEventParams
