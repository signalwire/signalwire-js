import { getConfig } from './utils/getConfig'
import { createRoomFactory } from './rooms/createRoomFactory'
import { createVRTFactory } from './rooms/createVRTFactory'
import { listAllRoomsFactory } from './rooms/listAllRoomsFactory'
import { Client } from './types'
import { makeApiClient } from './utils/httpClient'

export const createClient: Client = (options = {}) => {
  const config = getConfig(options)

  const client = makeApiClient({
    baseUrl: config.spaceHost,
    headers: {
      Authorization: `Basic ${Buffer.from(config.authCreds).toString(
        'base64'
      )}`,
    },
  })

  const createRoom = createRoomFactory(client)
  const createVRT = createVRTFactory(client)
  const listAllRooms = listAllRoomsFactory(client)

  return {
    createRoom,
    createVRT,
    listAllRooms,
  }
}
