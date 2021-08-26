import { CreateRoom } from './rooms/createRoomFactory'
import { CreateVRT } from './rooms/createVRTFactory'
import {
  GetRoom,
  GetRoomByIdOptions,
  GetRoomByNameOptions,
} from './rooms/getRoomFactory'
import { ListAllRooms } from './rooms/listAllRoomsFactory'
import { UpdateRoom } from './rooms/updateRoomFactory'
import { ConfigParamaters } from './utils/getConfig'
import { createHttpClient } from './utils/httpClient'

export type HttpClient = ReturnType<typeof createHttpClient>

interface VideoSDKClient {
  createRoom: CreateRoom
  createVRT: CreateVRT
  listAllRooms: ListAllRooms
  getRoomByName: GetRoom<GetRoomByNameOptions>
  getRoomById: GetRoom<GetRoomByIdOptions>
  updateRoom: UpdateRoom
}

export interface ListAllRoomsResponse {
  links: {
    self: string
    first: string
    // TODO: validate this
    next: string | null
  }
  rooms: RoomResponse[]
}

export interface RoomResponse {
  id: string
  name: string
  display_name: string
  max_participants: number
  delete_on_end: boolean
  starts_at: string
  ends_at: string
  created_at: string
  updated_at: string
}

export type Client = (options?: ConfigParamaters) => VideoSDKClient
