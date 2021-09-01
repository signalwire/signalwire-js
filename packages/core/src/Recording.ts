import { BaseComponent } from './BaseComponent'
import { RoomCustomMethods } from './utils/interfaces'
import * as Rooms from './rooms'

class Recording extends BaseComponent {
  // Required for defineProperties customMethods
  recordingId: string
  roomSessionId: string

  constructor(public options: any) {
    super(options)
    // TODO: set __uuid on BaseComponent too.
    this.recordingId = this.options.id
    this.roomSessionId = this.options.roomSessionId
  }
}

const customMethods: RoomCustomMethods<any> = {
  stop: Rooms.stopRecording,
  pause: Rooms.pauseRecording,
  resume: Rooms.resumeRecording,
}
Object.defineProperties(Recording.prototype, customMethods)

export { Recording }
