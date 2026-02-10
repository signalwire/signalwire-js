import { HttpClient } from '../types'

interface CreateVRTOptions {
  roomName: string
  userName: string
  scopes?: string[]
}

interface CreateVRTResponse {
  token: string
}

export type CreateVRT = (
  options: CreateVRTOptions
) => Promise<CreateVRTResponse>

type CreateVRTFactory = (client: HttpClient) => CreateVRT

export const createVRTFactory: CreateVRTFactory = (client) => async (
  options
) => {
  const { roomName: room_name, userName: user_name, scopes } = options
  const { body } = await client<CreateVRTResponse>('video/room_tokens', {
    method: 'POST',
    body: {
      room_name,
      user_name,
      scopes,
    },
  })

  return body
}
