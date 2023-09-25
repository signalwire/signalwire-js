import { EventEmitter } from '@signalwire/core'
import { configureFullStack } from '../../testUtils'
import { createClient } from '../../client/createClient'
import { Video } from '../Video'
import { RoomSessionAPI, RoomSession } from '../RoomSession'
import { RoomSessionRecording } from './RoomSessionRecording'

describe('RoomSessionRecording', () => {
  let video: Video
  let roomSession: RoomSession
  let recording: RoomSessionRecording

  const roomSessionId = 'room-session-id'
  const { store, destroy } = configureFullStack()

  const userOptions = {
    host: 'example.com',
    project: 'example.project',
    token: 'example.token',
    store,
  }

  beforeEach(() => {
    const swClientMock = {
      userOptions,
      client: createClient(userOptions),
    }
    // @ts-expect-error
    video = new Video(swClientMock)
    // @ts-expect-error
    video._client.execute = jest.fn()
    // @ts-expect-error
    video._client.runWorker = jest.fn()

    roomSession = new RoomSessionAPI({
      video,
      payload: {
        room_session: {
          id: roomSessionId,
          event_channel: 'room.e4b8baff-865d-424b-a210-4a182a3b1451',
        },
      },
    })

    recording = new RoomSessionRecording({
      payload: {
        //@ts-expect-error
        recording: {
          id: 'c22d7223-5a01-49fe-8da0-46bec8e75e32',
        },
        room_session_id: roomSessionId,
      },
      roomSession,
    })
    // @ts-expect-error
    recording._client.execute = jest.fn()
  })

  afterAll(() => {
    destroy()
  })

  it('should have an event emitter', () => {
    expect(recording['emitter']).toBeInstanceOf(EventEmitter)
  })

  it('should declare the correct event map', () => {
    const expectedEventMap = {
      onStarted: 'recording.started',
      onUpdated: 'recording.updated',
      onEnded: 'recording.ended',
    }
    expect(recording['_eventMap']).toEqual(expectedEventMap)
  })

  it('should control an active recording', async () => {
    const baseExecuteParams = {
      method: '',
      params: {
        room_session_id: 'room-session-id',
        recording_id: 'c22d7223-5a01-49fe-8da0-46bec8e75e32',
      },
    }
    await recording.pause()
    // @ts-expect-error
    expect(recording._client.execute).toHaveBeenLastCalledWith({
      ...baseExecuteParams,
      method: 'video.recording.pause',
    })
    await recording.resume()
    // @ts-expect-error
    expect(recording._client.execute).toHaveBeenLastCalledWith({
      ...baseExecuteParams,
      method: 'video.recording.resume',
    })
    await recording.stop()
    // @ts-expect-error
    expect(recording._client.execute).toHaveBeenLastCalledWith({
      ...baseExecuteParams,
      method: 'video.recording.stop',
    })
  })
})
