import { SwEvent, RoomStarted, RoomUpdated, RoomEnded } from '.'

export type CantinaNamespace = 'cantina-manager'
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
  ToInternalCantinaEvent<CantinaRoomEventNames>

/** @internal */
type CantinaRoomMemberRole =
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
  cantina_id: string
  last_snapshot?: string
  member_count: number
  recording: boolean
  locked: boolean
  room_type: 'permanent' | 'adhoc'
  visibility: 'pinned' | 'normal' | 'occupied'
  room_description?: string
  join_button?: string
  order_priority?: number
  custom_alone?: string
  custom_canvas?: string
  custom_empty?: string
  custom_preview?: string
  has_sms_from_number: boolean
  auto_open_nav: boolean
  my_roles: CantinaRoomMemberRole[]
}

/**
 * ==========
 * ==========
 * Server-Side Events
 * ==========
 * ==========
 */

/**
 * 'cantina-manager.rooms.subscribed'
 */
export interface CantinaRoomsSubscribedEventParams {
  rooms: CantinaRoomEntity[]
}

export interface CantinaRoomsSubscribedEvent extends SwEvent {
  event_type: ToInternalCantinaEvent<RoomsSubscribed>
  params: CantinaRoomsSubscribedEventParams
}

/**
 * 'cantina-manager.room.started'
 * 'cantina-manager.room.added'
 * 'cantina-manager.room.updated'
 * 'cantina-manager.room.ended'
 * 'cantina-manager.room.deleted'
 */
export interface CantinaRoomEventParams {
  room: CantinaRoomEntity
}

export interface CantinaRoomEvent extends SwEvent {
  event_type: ToInternalCantinaEvent<CantinaRoomEventNames>
  params: CantinaRoomEventParams
}

export type CantinaEvent = CantinaRoomsSubscribedEvent | CantinaRoomEvent

export type CantinaEventParams =
  | CantinaRoomsSubscribedEventParams
  | CantinaRoomEventParams
