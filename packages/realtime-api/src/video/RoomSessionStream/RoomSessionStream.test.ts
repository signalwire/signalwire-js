import { EventEmitter } from '@signalwire/core'
import { configureFullStack } from '../../testUtils'
import { createClient } from '../../client/createClient'
import { Video } from '../Video'
import { RoomSessionAPI, RoomSession } from '../RoomSession'
import { RoomSessionStream } from './RoomSessionStream'

describe('RoomSessionStream', () => {
  let video: Video
  let roomSession: RoomSession
  let stream: RoomSessionStream

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

    console.log('room', roomSession._sw)

    stream = new RoomSessionStream({
      payload: {
        // @ts-expect-error
        stream: {
          id: 'c22d7223-5a01-49fe-8da0-46bec8e75e32',
        },
        room_session_id: roomSessionId,
      },
      roomSession,
    })
    // @ts-expect-error
    stream._client.execute = jest.fn()
  })

  afterAll(() => {
    destroy()
  })

  it('should have an event emitter', () => {
    expect(stream['emitter']).toBeInstanceOf(EventEmitter)
  })

  // it('should declare the correct event map', () => {
  //   const expectedEventMap = {
  //     onStarted: 'stream.started',
  //     onEnded: 'stream.ended',
  //   }
  //   expect(stream['_eventMap']).toEqual(expectedEventMap)
  // })

  // it('should control an active stream', async () => {
  //   const baseExecuteParams = {
  //     method: '',
  //     params: {
  //       room_session_id: 'room-session-id',
  //       stream_id: 'c22d7223-5a01-49fe-8da0-46bec8e75e32',
  //     },
  //   }

  //   await stream.stop()
  //   // @ts-expect-error
  //   expect(stream._client.execute).toHaveBeenLastCalledWith({
  //     ...baseExecuteParams,
  //     method: 'video.stream.stop',
  //   })
  // })
})
