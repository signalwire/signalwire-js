import { CreateRoomObjectOptions, createRoomObject } from './createRoomObject'

/**
 * Using Video.joinRoom() you can automatically join a room.
 *
 * @example
 * With an HTMLDivElement with id="root" in the DOM.
 * ```js
 * // <div id="root"></div>
 *
 * try {
 *   const roomObj = await Video.joinRoom({
 *     token: '<YourJWT>',
 *     rootElementId: 'root',
 *   })
 *
 *   // You have joined the room..
 * } catch (error) {
 *   console.error('Error', error)
 * }
 * ```
 * @deprecated Use {@link RoomSession} instead.
 */
export const joinRoom = (roomOptions: CreateRoomObjectOptions) => {
  return createRoomObject({
    ...roomOptions,
    autoJoin: true,
  })
}
