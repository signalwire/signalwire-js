import type { Constructor, BCConstructor } from './'

interface RoomLayoutMethods {
  getLayoutList: () => Promise<unknown>
  setLayout: (params: { name: string }) => Promise<unknown>
}
export type RoomLayoutConstructor = Constructor<RoomLayoutMethods>

export function withRoomLayoutMethods<T extends BCConstructor>(
  Base: T
): T & RoomLayoutConstructor {
  return class extends Base {
    getLayoutList() {
      return this.execute({
        method: 'video.list_available_layouts',
        params: {
          room_session_id: this.roomSessionId,
        },
      })
    }

    setLayout({ name }: { name: string }) {
      return this.execute({
        method: 'video.set_layout',
        params: {
          room_session_id: this.roomSessionId,
          name,
        },
      })
    }
  }
}
