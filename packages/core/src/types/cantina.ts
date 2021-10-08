import { SwEvent, RoomStarted, RoomUpdated, RoomEnded } from '.'

/** @internal */
export type CantinaRoomEvents = RoomStarted | RoomUpdated | RoomEnded

type ToInternalCantinaRoomEvent<T extends CantinaRoomEvents> = `cantina-manager.${T}`

/** @internal */
export type InternalCantinaRoomEvents = ToInternalCantinaRoomEvent<CantinaRoomEvents>

/** @internal */
export type CantinaRoomTypes = 'permanent' | 'adhoc' | 'hidden'

/** @internal */
export type CantinaRoomMemberRoles = 
  | 'inviteable' 
  | 'configurator' 
  | 'visitor' 
  | 'attendee' 
  | 'moderator'
  | 'manager'

/** @internal */
export interface CantinaRoomEntity {
  id: string
  cantina_id: string
  project_id: string
  name: string
  preview: string
  last_snapshot?: string
  member_count: number
  recording: boolean
  locked: boolean
  room_type: CantinaRoomTypes
  visibility: 'normal'
  room_descript?: string
  join_button?: string
  order_priority?: number
  custom_alone?: string
  custom_canvas?: string
  custom_empty?: string
  custom_preview?: string
  has_sms_from_number: boolean
  auto_open_nav: boolean
  my_roles: CantinaRoomMemberRoles[]
}

/** @internal */
export interface CantinaRoomEventParams {
  room: CantinaRoomEntity
}

/** @internal */
export interface CantinaRoomEvent extends SwEvent {
  event_type: InternalCantinaRoomEvents,
  params: CantinaRoomEventParams
}

/** @internal */
export type CantinaEventParams = CantinaRoomEvent
