import { EventEmitter } from '@signalwire/core'
import { configureFullStack } from '../../testUtils'
import { createClient } from '../../client/createClient'
import { Video } from '../Video'
import { RoomSessionAPI, RoomSession } from '../RoomSession'
import { RoomSessionPlayback } from './RoomSessionPlayback'

describe('RoomSessionPlayback', () => {
  let video: Video
  let roomSession: RoomSession
  let playback: RoomSessionPlayback

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

    playback = new RoomSessionPlayback({
      payload: {
        //@ts-expect-error
        playback: {
          id: 'c22d7223-5a01-49fe-8da0-46bec8e75e32',
        },
        room_session_id: roomSessionId,
      },
      roomSession,
    })
    // @ts-expect-error
    playback._client.execute = jest.fn()
  })

  afterAll(() => {
    destroy()
  })

  it('should have an event emitter', () => {
    expect(playback['emitter']).toBeInstanceOf(EventEmitter)
  })

  it('should declare the correct event map', () => {
    const expectedEventMap = {
      onStarted: 'playback.started',
      onUpdated: 'playback.updated',
      onEnded: 'playback.ended',
    }
    expect(playback['_eventMap']).toEqual(expectedEventMap)
  })

  it('should control an active playback', async () => {
    const baseExecuteParams = {
      method: '',
      params: {
        room_session_id: roomSessionId,
        playback_id: 'c22d7223-5a01-49fe-8da0-46bec8e75e32',
      },
    }
    await playback.pause()
    // @ts-expect-error
    expect(playback._client.execute).toHaveBeenLastCalledWith({
      ...baseExecuteParams,
      method: 'video.playback.pause',
    })
    await playback.resume()
    // @ts-expect-error
    expect(playback._client.execute).toHaveBeenLastCalledWith({
      ...baseExecuteParams,
      method: 'video.playback.resume',
    })
    await playback.stop()
    // @ts-expect-error
    expect(playback._client.execute).toHaveBeenLastCalledWith({
      ...baseExecuteParams,
      method: 'video.playback.stop',
    })
    await playback.setVolume(30)
    // @ts-expect-error
    expect(playback._client.execute).toHaveBeenLastCalledWith({
      method: 'video.playback.set_volume',
      params: {
        room_session_id: roomSessionId,
        playback_id: 'c22d7223-5a01-49fe-8da0-46bec8e75e32',
        volume: 30,
      },
    })
  })
})
