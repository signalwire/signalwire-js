import { Got } from 'got'
import { ConfigParamaters } from './get-config'
import { CreateRoom } from './rooms/createRoomFactory'
import { CreateVRT } from './rooms/createVRTFactory'
import { ListAllRooms } from './rooms/listAllRoomsFactory'

export type HttpClient = Got

interface VideoSDKClient {
  createRoom: CreateRoom
  createVRT: CreateVRT
  listAllRooms: ListAllRooms
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

export type Client = (options: ConfigParamaters) => VideoSDKClient
