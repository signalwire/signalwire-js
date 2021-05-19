import { CreateRoomObjectOptions, createRoomObject } from './createRoomObject'

export const joinRoom = (roomOptions: CreateRoomObjectOptions) => {
  return createRoomObject({
    ...roomOptions,
    autoJoin: true,
  })
}
