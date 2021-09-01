import { connect } from '../redux'
import { BaseComponent } from '../BaseComponent'
import { BaseComponentOptions } from '../utils/interfaces'

class RoomSessionRecording extends BaseComponent {
  id: string
  roomSessionId: string

  pause() {
    return this.execute({
      method: 'video.recording.pause',
      params: {
        room_session_id: this.roomSessionId,
        recording_id: this.id,
      },
    })
  }

  resume() {
    return this.execute({
      method: 'video.recording.resume',
      params: {
        room_session_id: this.roomSessionId,
        recording_id: this.id,
      },
    })
  }

  stop() {
    return this.execute({
      method: 'video.recording.stop',
      params: {
        room_session_id: this.roomSessionId,
        recording_id: this.id,
      },
    })
  }
}

// TODO: move to its own file
const createRoomSessionRecordingObject = (params: BaseComponentOptions) => {
  const recording: RoomSessionRecording = connect({
    store: params.store,
    Component: RoomSessionRecording,
    componentListeners: {
      errors: 'onError',
      responses: 'onSuccess',
    },
  })(params)

  return recording
}

export { RoomSessionRecording, createRoomSessionRecordingObject }
