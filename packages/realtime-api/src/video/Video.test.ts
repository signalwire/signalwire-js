import { EventEmitter, actions } from '@signalwire/core'
import { Video } from './Video'
import { RoomSession } from './RoomSession'
import { createClient } from '../client/createClient'
import { configureFullStack } from '../testUtils'

describe('Video Object', () => {
  let video: Video

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
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  afterAll(() => {
    destroy()
  })

  it('should have an event emitter', () => {
    expect(video['emitter']).toBeInstanceOf(EventEmitter)
  })

  it('should declare the correct event map', () => {
    const expectedEventMap = {
      onRoomStarted: 'room.started',
      onRoomEnded: 'room.ended',
    }
    expect(video['_eventMap']).toEqual(expectedEventMap)
  })

  it('should subscribe to events', async () => {
    await video.listen({
      onRoomStarted: jest.fn(),
      onRoomEnded: jest.fn(),
    })

    // @ts-expect-error
    expect(video._client.execute).toHaveBeenCalledWith({
      method: 'signalwire.subscribe',
      params: {
        get_initial_state: true,
        event_channel: 'video.rooms',
        events: ['video.room.started', 'video.room.ended'],
      },
    })
  })

  describe('video.room.started event', () => {
    const eventChannelOne = 'room.<uuid-one>'
    const firstRoom = JSON.parse(
      `{"jsonrpc":"2.0","id":"uuid1","method":"signalwire.event","params":{"params":{"room":{"recording":false,"room_session_id":"session-one","name":"First Room","hide_video_muted":false,"music_on_hold":false,"room_id":"room_id","event_channel":"${eventChannelOne}"},"room_session_id":"session-one","room_id":"room_id","room_session":{"recording":false,"name":"First Room","hide_video_muted":false,"id":"session-one","music_on_hold":false,"room_id":"room_id","event_channel":"${eventChannelOne}"}},"timestamp":1631692502.1308,"event_type":"video.room.started","event_channel":"video.rooms.4b7ae78a-d02e-4889-a63b-08b156d5916e"}}`
    )
    const eventChannelTwo = 'room.<uuid-two>'
    const secondRoom = JSON.parse(
      `{"jsonrpc":"2.0","id":"uuid1","method":"signalwire.event","params":{"params":{"room":{"recording":false,"room_session_id":"session-two","name":"Second Room","hide_video_muted":false,"music_on_hold":false,"room_id":"room_id","event_channel":"${eventChannelTwo}"},"room_session_id":"session-two","room_id":"room_id","room_session":{"recording":false,"name":"Second Room","hide_video_muted":false,"id":"session-two","music_on_hold":false,"room_id":"room_id","event_channel":"${eventChannelTwo}"}},"timestamp":1631692502.1308,"event_type":"video.room.started","event_channel":"video.rooms.4b7ae78a-d02e-4889-a63b-08b156d5916e"}}`
    )

    it('should pass a room object to the listener', async () => {
      const promise = new Promise<void>(async (resolve) => {
        await video.listen({
          onRoomStarted: (room) => {
            expect(room.id).toBe('session-one')
            expect(room.name).toBe('First Room')
            expect(room.videoMute).toBeDefined()
            expect(room.videoUnmute).toBeDefined()
            expect(room.getMembers).toBeDefined()
            resolve()
          },
        })
      })

      // @ts-expect-error
      video._client.store.channels.sessionChannel.put(
        actions.socketMessageAction(firstRoom)
      )

      await promise
    })

    it('each room object should use its own payload from the Proxy', async () => {
      const promise = new Promise<void>(async (resolve) => {
        await video.listen({
          onRoomStarted: (room) => {
            expect(room.videoMute).toBeDefined()
            expect(room.videoUnmute).toBeDefined()
            expect(room.getMembers).toBeDefined()
            expect(room.listen).toBeDefined()
            if (room.id === 'session-two') {
              resolve()
            }
          },
          onRoomEnded: () => {},
        })
      })

      // @ts-expect-error
      video._client.store.channels.sessionChannel.put(
        actions.socketMessageAction(firstRoom)
      )
      // @ts-expect-error
      video._client.store.channels.sessionChannel.put(
        actions.socketMessageAction(secondRoom)
      )

      // @ts-expect-error
      expect(video._client.execute).toHaveBeenCalledTimes(1)
      // @ts-expect-error
      expect(video._client.execute).toHaveBeenNthCalledWith(1, {
        method: 'signalwire.subscribe',
        params: {
          event_channel: 'video.rooms',
          events: ['video.room.started', 'video.room.ended'],
          get_initial_state: true,
        },
      })

      await promise
    })
  })

  // describe('video.room.ended event', () => {
  //   const roomEndedEvent = JSON.parse(
  //     `{"jsonrpc":"2.0","id":"uuid2","method":"signalwire.event","params":{"params":{"room":{"recording":false,"room_session_id":"session-one","name":"First Room","hide_video_muted":false,"music_on_hold":false,"room_id":"room_id","event_channel":"room.<uuid-one>"},"room_session_id":"session-one","room_id":"room_id","room_session":{"recording":false,"name":"First Room","hide_video_muted":false,"id":"session-one","music_on_hold":false,"room_id":"room_id","event_channel":"room.<uuid-one>"}},"timestamp":1631692510.415,"event_type":"video.room.ended","event_channel":"video.rooms.4b7ae78a-d02e-4889-a63b-08b156d5916e"}}`
  //   )

  //   it('should pass a Room obj to the handler', (done) => {
  //     video.listen({
  //       onRoomEnded: (room) => {
  //         expect(room.id).toBe('session-one')
  //         expect(room.name).toBe('First Room')
  //         expect(room.videoMute).toBeDefined()
  //         expect(room.videoUnmute).toBeDefined()
  //         expect(room.getMembers).toBeDefined()
  //         done()
  //       },
  //     })

  //     // @ts-expect-error
  //     video._client.store.dispatch(actions.socketMessageAction(roomEndedEvent))
  //   })
  // })

  describe('getRoomSessions()', () => {
    it('should be defined', () => {
      expect(video.getRoomSessions).toBeDefined()
      expect(video.getRoomSessions).toBeInstanceOf(Function)
    })

    it('should return an obj with a list of RoomSession objects', async () => {
      // @ts-expect-error
      ;(video._client.execute as jest.Mock).mockResolvedValueOnce({
        code: '200',
        message: 'OK',
        rooms: [
          {
            room_id: '776f0ece-75ce-4f84-8ce6-bd5677f2cbb9',
            id: '25ab8daa-2639-45ed-bc73-69b664f55eff',
            event_channel: 'EC_2404d4b8-fed1-48cc-8e84-9fd55d8cbd40',
            name: 'room-1',
            recording: true,
            hide_video_muted: false,
            layout_name: 'grid-responsive',
            display_name: 'themes',
            meta: {},
            members: [
              {
                id: 'f8e8be92-a2e7-4e00-84f5-f50322ee37d0',
                room_id: '776f0ece-75ce-4f84-8ce6-bd5677f2cbb9',
                room_session_id: '25ab8daa-2639-45ed-bc73-69b664f55eff',
                name: 'Tester',
                type: 'member',
                parent_id: '',
                requested_position: 'auto',
                visible: false,
                audio_muted: true,
                video_muted: true,
                deaf: false,
                input_volume: 0,
                output_volume: 0,
                input_sensitivity: 11.11111111111111,
                meta: {},
              },
            ],
          },
          {
            room_id: '088811be-8ecf-4f11-bfc1-45caa905130d',
            id: 'c22fa141-a3f0-4923-b44c-e49aa318c3dd',
            event_channel: 'EC_d28d0ec6-e233-46b0-8dac-5f1b33e95cf0',
            name: 'room-2',
            recording: false,
            hide_video_muted: false,
            layout_name: 'grid-responsive',
            display_name: 'sdk-room',
            meta: {},
            members: [
              {
                id: '725b616b-754f-4aaf-9517-fb5d1b358497',
                room_id: '088811be-8ecf-4f11-bfc1-45caa905130d',
                room_session_id: 'c22fa141-a3f0-4923-b44c-e49aa318c3dd',
                name: 'Testing',
                type: 'member',
                parent_id: '',
                requested_position: 'auto',
                visible: false,
                audio_muted: true,
                video_muted: true,
                deaf: false,
                input_volume: 0,
                output_volume: 0,
                input_sensitivity: 11.11111111111111,
                meta: {},
              },
            ],
          },
        ],
      })

      const result = await video.getRoomSessions()

      expect(result.roomSessions).toHaveLength(2)
      expect(result.roomSessions[0]).toBeInstanceOf(RoomSession)
      expect(result.roomSessions[0].id).toBe(
        '25ab8daa-2639-45ed-bc73-69b664f55eff'
      )
      expect(result.roomSessions[0].roomId).toBe(
        '776f0ece-75ce-4f84-8ce6-bd5677f2cbb9'
      )
      expect(result.roomSessions[0].displayName).toBe('themes')
      expect(result.roomSessions[0].recording).toBe(true)
      expect(result.roomSessions[0].getMembers).toBeDefined()

      expect(result.roomSessions[1]).toBeInstanceOf(RoomSession)
      expect(result.roomSessions[1].id).toBe(
        'c22fa141-a3f0-4923-b44c-e49aa318c3dd'
      )
      expect(result.roomSessions[1].roomId).toBe(
        '088811be-8ecf-4f11-bfc1-45caa905130d'
      )
      expect(result.roomSessions[1].displayName).toBe('sdk-room')
      expect(result.roomSessions[1].recording).toBe(false)
      expect(result.roomSessions[1].getMembers).toBeDefined()
    })
  })

  describe('getRoomSessionById()', () => {
    it('should be defined', () => {
      expect(video.getRoomSessionById).toBeDefined()
      expect(video.getRoomSessionById).toBeInstanceOf(Function)
    })

    it('should return a RoomSession object', async () => {
      // @ts-expect-error
      ;(video._client.execute as jest.Mock).mockResolvedValueOnce({
        room: {
          room_id: '776f0ece-75ce-4f84-8ce6-bd5677f2cbb9',
          id: '25ab8daa-2639-45ed-bc73-69b664f55eff',
          event_channel: 'EC_2404d4b8-fed1-48cc-8e84-9fd55d8cbd40',
          name: 'room-1',
          recording: true,
          hide_video_muted: false,
          layout_name: 'grid-responsive',
          display_name: 'themes',
          meta: {},
          members: [
            {
              id: 'f8e8be92-a2e7-4e00-84f5-f50322ee37d0',
              room_id: '776f0ece-75ce-4f84-8ce6-bd5677f2cbb9',
              room_session_id: '25ab8daa-2639-45ed-bc73-69b664f55eff',
              name: 'Tester',
              type: 'member',
              parent_id: '',
              requested_position: 'auto',
              visible: false,
              audio_muted: true,
              video_muted: true,
              deaf: false,
              input_volume: 0,
              output_volume: 0,
              input_sensitivity: 11.11111111111111,
              meta: {},
            },
          ],
        },
        code: '200',
        message: 'OK',
      })

      const result = await video.getRoomSessionById(
        '25ab8daa-2639-45ed-bc73-69b664f55eff'
      )

      expect(result.roomSession).toBeInstanceOf(RoomSession)
      expect(result.roomSession.id).toBe('25ab8daa-2639-45ed-bc73-69b664f55eff')
      expect(result.roomSession.roomId).toBe(
        '776f0ece-75ce-4f84-8ce6-bd5677f2cbb9'
      )
      expect(result.roomSession.displayName).toBe('themes')
      expect(result.roomSession.recording).toBe(true)
    })
  })
})
