import { HttpClient, RoomResponse } from '../types'

export interface GetRoomByIdOptions {
  id: string
}

export interface GetRoomByNameOptions {
  name: string
}

export type GetRoom<T> = (options: T) => Promise<RoomResponse | null>

type getRoomFactory = (
  client: HttpClient
) => {
  getRoomById: GetRoom<GetRoomByIdOptions>
  getRoomByName: GetRoom<GetRoomByNameOptions>
}

export const getRoomFactory: getRoomFactory = (client) => {
  const getRoomPath = 'video/rooms'
  const getRoom = async ({ id }: { id: string }) => {
    try {
      const { body } = await client<RoomResponse>(`${getRoomPath}/${id}`, {
        method: 'GET',
      })

      return body
    } catch (e) {
      if (e.code === 404) {
        return null
      }

      throw e
    }
  }

  return {
    async getRoomById(options: GetRoomByIdOptions) {
      return getRoom({ id: options.id })
    },
    async getRoomByName(options: GetRoomByNameOptions) {
      return getRoom({ id: options.name })
    },
  }
}
