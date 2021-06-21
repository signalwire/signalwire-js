import { createClient } from './createClient'
import { createRoomObject } from './createRoomObject'
import { joinRoom } from './joinRoom'
import { Client } from './Client'

export { Client, createClient, createRoomObject, joinRoom }

export type { RoomObject } from './Client'
export type { CreateRoomObjectOptions } from './createRoomObject'
