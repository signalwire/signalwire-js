import { BaseComponent, BaseComponentOptions } from '@signalwire/core'

interface RoomOptions extends BaseComponentOptions {
  name: string
  roomId: string
  roomSessionId: string
}

export class Room extends BaseComponent {
  constructor(public options: RoomOptions) {
    super(options)
  }

  get name() {
    return this.options.name
  }

  get roomId() {
    return this.options.roomId
  }

  get roomSessionId() {
    return this.options.roomSessionId
  }
}
