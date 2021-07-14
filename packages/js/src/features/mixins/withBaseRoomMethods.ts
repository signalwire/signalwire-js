import type { Constructor, BCConstructor } from './'

interface RoomMethods {
  join: () => Promise<unknown>
  leave: () => Promise<unknown>
}
export type BaseRoomConstructor = Constructor<RoomMethods>

export function withBaseRoomMethods<T extends BCConstructor>(
  Base: T
): T & BaseRoomConstructor {
  return class TC extends Base {
    join() {
      return this.invite()
    }

    leave() {
      return this.hangup()
    }
  }
}
