import { HttpClient, RoomResponse } from '../types'
import { listAllRoomsFactory } from './listAllRoomsFactory'

interface CreateRoomOptions {
  name: string
  displayName?: string
  maxParticipants?: number
  deleteOnEnd?: boolean
  startsAt?: string
  endsAt?: string
}

export type CreateRoom = (options: CreateRoomOptions) => Promise<RoomResponse>

type CreateRoomFactory = (client: HttpClient) => CreateRoom

export const createRoomFactory: CreateRoomFactory = (client) => async (
  options
) => {
  const {
    name,
    displayName: display_name,
    maxParticipants: max_participants,
    deleteOnEnd: delete_on_end,
    startsAt: starts_at,
    endsAt: ends_at,
  } = options

  try {
    // TODO: Replace this once we have an API for fetching by roomName
    const listAllRooms = listAllRoomsFactory(client)
    const rooms = await listAllRooms()

    const existingRoom = rooms.rooms.find((room) => room.name === name)

    if (existingRoom) {
      return existingRoom
    }
  } catch (e) {
    console.error(
      'Error while trying to fetch list of available rooms',
      e.response.body
    )

    // TODO: handle error
  }

  const { body } = await client.post<RoomResponse>('video/rooms', {
    json: {
      name,
      display_name,
      max_participants,
      delete_on_end,
      starts_at,
      ends_at,
    },
    responseType: 'json',
  })

  return body
}
