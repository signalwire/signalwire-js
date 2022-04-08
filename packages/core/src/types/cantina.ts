import { SwEvent, RoomStarted, RoomUpdated, RoomEnded } from '.'
import { CamelToSnakeCase } from './utils'

export type CantinaNamespace = 'video-manager'
type ToInternalCantinaEvent<T extends string> = `${CantinaNamespace}.${T}`

type RoomsSubscribed = 'rooms.subscribed'
type RoomAdded = 'room.added'
type RoomDeleted = 'room.deleted'

/** @internal */
export type CantinaRoomEventNames =
  | RoomStarted
  | RoomAdded
  | RoomUpdated
  | RoomEnded
  | RoomDeleted

/**
 * List of internal events
 * @internal
 */
export type InternalCantinaRoomEventNames =
  | ToInternalCantinaEvent<RoomsSubscribed>
  | ToInternalCantinaEvent<CantinaRoomEventNames>

/** @internal */
type CantinaRoomRole =
  | 'inviteable'
  | 'configurator'
  | 'visitor'
  | 'attendee'
  | 'moderator'
  | 'manager'

/** @internal */
export interface CantinaRoomEntity {
  id: string
  name: string
  cantinaId: string
  lastSnapshot?: string
  memberCount: number
  recording: boolean
  locked: boolean
  roomType: 'permanent' | 'adhoc'
  visibility: 'pinned' | 'normal' | 'occupied'
  roomDescription?: string
  joinButton?: string
  orderPriority?: number
  customAlone?: string
  customCanvas?: string
  customEmpty?: string
  customPreview?: string
  hasSmsFromNumber: boolean
  autoOpenNav: boolean
  myRoles: CantinaRoomRole[]
}

/**
 * CantinaRoomEntity for internal usage (converted to snake_case)
 * @internal
 */
export type InternalCantinaRoomEntity = {
  [K in keyof CantinaRoomEntity as CamelToSnakeCase<K>]: CantinaRoomEntity[K]
}

/**
 * ==========
 * ==========
 * Server-Side Events
 * ==========
 * ==========
 */

/**
 * 'video-manager.rooms.subscribed'
 */
export interface CantinaRoomsSubscribedEventParams {
  rooms: InternalCantinaRoomEntity[]
}

export interface CantinaRoomsSubscribedEvent extends SwEvent {
  event_type: ToInternalCantinaEvent<RoomsSubscribed>
  params: CantinaRoomsSubscribedEventParams
}

/**
 * 'video-manager.room.started'
 * 'video-manager.room.added'
 * 'video-manager.room.updated'
 * 'video-manager.room.ended'
 * 'video-manager.room.deleted'
 */
export interface CantinaRoomEventParams {
  room: InternalCantinaRoomEntity
}

export interface CantinaRoomEvent extends SwEvent {
  event_type: ToInternalCantinaEvent<CantinaRoomEventNames>
  params: CantinaRoomEventParams
}

export type CantinaEvent = CantinaRoomsSubscribedEvent | CantinaRoomEvent

export type CantinaEventParams =
  | CantinaRoomsSubscribedEventParams
  | CantinaRoomEventParams
