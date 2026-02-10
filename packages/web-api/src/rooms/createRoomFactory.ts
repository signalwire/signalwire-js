import { HttpClient, RoomResponse } from '../types'
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

  const { body } = await client<RoomResponse>('video/rooms', {
    method: 'POST',
    body: {
      name,
      display_name,
      max_participants,
      delete_on_end,
      starts_at,
      ends_at,
    },
  })

  return body
}
