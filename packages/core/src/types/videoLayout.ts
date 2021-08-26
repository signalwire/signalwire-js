import type { SwEvent } from '.'
import type { CamelToSnakeCase, VideoEventToInternal } from './utils'

export type LayoutChanged = 'layout.changed'

/**
 * List of public event names
 */
export type VideoLayoutEventNames = LayoutChanged

/**
 * List of internal events
 * @internal
 */
export type InternalVideoLayoutEventNames =
  VideoEventToInternal<VideoLayoutEventNames>

/**
 * Base Interface for a VideoLayout entity
 */
export interface VideoLayout {
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
}

/**
 * VideoLayout entity for internal usage (converted to snake_case)
 * @internal
 */
type InternalVideoLayoutLayer = {
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
  event_type: VideoEventToInternal<LayoutChanged>
  params: VideoLayoutChangedEventParams
}

// prettier-ignore
export type VideoLayoutEvent =
  | VideoLayoutChangedEvent

// prettier-ignore
export type VideoLayoutEventParams =
  | VideoLayoutChangedEventParams
