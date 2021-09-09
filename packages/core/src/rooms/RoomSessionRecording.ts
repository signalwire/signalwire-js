import { connect } from '../redux'
import { BaseComponent } from '../BaseComponent'
import { BaseComponentOptions } from '../utils/interfaces'
import { OnlyFunctionProperties } from '../types'

export interface RoomSessionRecording {
  id: string
  roomSessionId: string
  state: string
  duration: string

  pause(): Promise<void>
  resume(): Promise<void>
  stop(): Promise<void>
}

export class RoomSessionRecordingAPI
  extends BaseComponent<RoomSessionRecording>
  implements OnlyFunctionProperties<RoomSessionRecording>
{
  async pause() {
    await this.execute({
      method: 'video.recording.pause',
      params: {
        room_session_id: this.getStateProperty('roomSessionId'),
        recording_id: this.getStateProperty('id'),
      },
    })
  }

  async resume() {
    await this.execute({
      method: 'video.recording.resume',
      params: {
        room_session_id: this.getStateProperty('roomSessionId'),
        recording_id: this.getStateProperty('id'),
      },
    })
  }

  async stop() {
    await this.execute({
      method: 'video.recording.stop',
      params: {
        room_session_id: this.getStateProperty('roomSessionId'),
        recording_id: this.getStateProperty('id'),
      },
    })
  }
}

// TODO: move to its own file
export const createRoomSessionRecordingObject = (
  // TODO: check generic
  params: BaseComponentOptions<{}>
) => {
  const recording = connect({
    store: params.store,
    // @ts-expect-error
    Component: RoomSessionRecordingAPI,
    componentListeners: {
      errors: 'onError',
      responses: 'onSuccess',
    },
  })(params)

  return recording as any as RoomSessionRecordingAPI
}
