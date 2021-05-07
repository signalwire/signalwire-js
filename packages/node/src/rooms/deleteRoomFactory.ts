import { HttpClient } from '../types'
interface DeleteRoomOptions {
  id: string
}

export type DeleteRoom = (options: DeleteRoomOptions) => Promise<void>

type DeleteRoomFactory = (client: HttpClient) => DeleteRoom

export const deleteRoomFactory: DeleteRoomFactory = (client) => async (
  options
) => {
  const { id } = options

  await client<void>(`video/rooms/${id}`, {
    method: 'DELETE',
  })
}
