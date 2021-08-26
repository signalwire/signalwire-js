import { HttpClient, RoomResponse } from '../types'
interface UpdateRoomOptions {
  name: string
  displayName?: string
  maxParticipants?: number
  deleteOnEnd?: boolean
  startsAt?: string
  endsAt?: string
}

export type UpdateRoom = (options: UpdateRoomOptions) => Promise<RoomResponse>

type UpdateRoomFactory = (client: HttpClient) => UpdateRoom

export const updateRoomFactory: UpdateRoomFactory = (client) => async (
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
    method: 'PUT',
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
