import type { RoomSession } from '../video/RoomSession'

export type RealTimeVideoApiEventsDocs = {
  /**
   * Emitted when a room session is started. Your event handler receives an
   * object which is an instance of {@link Video.RoomSession}. Example:
   *
   * ```javascript
   * const video = new Video.Client(...)
   * video.on('room.started', async (roomSession) => {
   *     console.log(roomSession.name)
   * })
   * ```
   */
  'room.started': (room: RoomSession) => void
  /**
   * Emitted when a room session ends. Your event handler receives an object
   * which is an instance of {@link Video.RoomSession}.
   *
   * ```javascript
   * const video = new Video.Client(...)
   * video.on('room.ended', async (roomSession) => {
   *     console.log(roomSession.name)
   * })
   * ```
   */
  'room.ended': (room: RoomSession) => void
}
