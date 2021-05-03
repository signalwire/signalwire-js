import { HttpClient } from '../types'

interface CreateRoomOptions {
  name: string
  displayName?: string
  maxParticipants?: number
  deleteOnEnd?: boolean
  startsAt?: string
  endsAt?: string
}

interface CreateRoomResponse {
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

export type CreateRoom = (
  options: CreateRoomOptions
) => Promise<CreateRoomResponse>

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
  const { body } = await client.post<CreateRoomResponse>('video/rooms', {
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
