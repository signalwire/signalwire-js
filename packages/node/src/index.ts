import { createRoomFactory } from './rooms/createRoomFactory'
import { createVRTFactory } from './rooms/createVRTFactory'
import { deleteRoomFactory } from './rooms/deleteRoomFactory'
import { getRoomFactory } from './rooms/getRoomFactory'
import { listAllRoomsFactory } from './rooms/listAllRoomsFactory'
import { updateRoomFactory } from './rooms/updateRoomFactory'
import { Client } from './types'
import { getConfig } from './utils/getConfig'
import { createHttpClient } from './utils/httpClient'

import { uuid } from '@signalwire/core'
console.log('HELLO 2', uuid())
export { uuid }

export const createRestClient: Client = (options = {}) => {
  const config = getConfig(options)

  const client = createHttpClient({
    baseUrl: config.baseUrl,
    headers: {
      Authorization: `Basic ${Buffer.from(config.authCreds).toString(
        'base64'
      )}`,
    },
  })

  const createRoom = createRoomFactory(client)
  const createVRT = createVRTFactory(client)
  const deleteRoom = deleteRoomFactory(client)
  const getRoom = getRoomFactory(client)
  const listAllRooms = listAllRoomsFactory(client)
  const updateRoom = updateRoomFactory(client)

  return {
    createRoom,
    deleteRoom,
    ...getRoom,
    listAllRooms,
    updateRoom,
    createVRT,
  }
}
