import { EventEmitter } from '@signalwire/core'
import { configureJestStore } from './testUtils'
import { createVideoObject, Video } from './Video'

describe('Member Object', () => {
  let store: any
  let video: Video

  beforeEach(() => {
    store = configureJestStore()
    video = createVideoObject({
      store: store,
      emitter: new EventEmitter(),
    })
    video.execute = jest.fn()
  })

  it('should not invoke execute without event listeners', async () => {
    await video.subscribe()
    expect(video.execute).not.toHaveBeenCalled()
  })

  it('should invoke execute with event listeners', async () => {
    video.on('event.here', jest.fn)
    await video.subscribe()
    expect(video.execute).toHaveBeenCalledWith({
      method: 'signalwire.subscribe',
      params: {
        get_initial_state: true,
        event_channel: 'video.rooms',
        events: ['video.event.here'],
      },
    })
  })

  describe('video.room.started event', () => {
    const eventChannelOne = 'room.<uuid-one>'
    const firstRoom = JSON.parse(
      `{"jsonrpc":"2.0","id":"uuid1","method":"signalwire.event","params":{"params":{"room_session_id":"session-one","room_id":"room_id","room":{"room_id":"room_id","room_session_id":"session-one","name":"First Room","event_channel":"${eventChannelOne}"}},"timestamp":1630004194.9456,"event_type":"video.room.started","event_channel":"video.rooms.78429ef1-283b-4fa9-8ebc-16b59f95bb1f"}}`
    )
    const eventChannelTwo = 'room.<uuid-one>'
    const secondRoom = JSON.parse(
      `{"jsonrpc":"2.0","id":"uuid1","method":"signalwire.event","params":{"params":{"room_session_id":"session-two","room_id":"room_id","room":{"room_id":"room_id","room_session_id":"session-two","name":"Second Room","event_channel":"${eventChannelTwo}"}},"timestamp":1630004194.9456,"event_type":"video.room.started","event_channel":"video.rooms.78429ef1-283b-4fa9-8ebc-16b59f95bb1f"}}`
    )

    it('should pass a Room obj to the handler', (done) => {
      video.on('room.started', (room) => {
        expect(room.videoMute).toBeDefined()
        expect(room.videoUnmute).toBeDefined()
        expect(room.getMembers).toBeDefined()
        expect(room.subscribe).toBeDefined()
        done()
      })

      video.subscribe()
      video.emit('video.room.started', firstRoom.params.params)
    })

    it('should destroy the cached obj when an event has no longer handlers attached', () => {
      const destroyer = jest.fn()
      const h = (room: any) => {
        room._destroyer = destroyer
      }
      video.on('room.started', h)

      video.subscribe()
      video.emit('video.room.started', firstRoom.params.params)

      video.off('room.started', h)
      expect(destroyer).toHaveBeenCalled()
    })

    it('should *not* destroy the cached obj when there are existing listeners attached', () => {
      const destroyer = jest.fn()
      const h = (room: any) => {
        room._destroyer = destroyer
      }
      video.on('room.started', h)
      video.on('room.started', () => {})

      video.subscribe()
      video.emit('video.room.started', firstRoom.params.params)

      video.off('room.started', h)
      expect(destroyer).not.toHaveBeenCalled()
    })

    it('should destroy the cached obj when .off is called with no handler', () => {
      const destroyer = jest.fn()
      const h = (room: any) => {
        room._destroyer = destroyer
      }
      video.on('room.started', h)
      video.on('room.started', () => {})
      video.on('room.started', () => {})

      video.subscribe()
      video.emit('video.room.started', firstRoom.params.params)

      video.off('room.started')
      expect(destroyer).toHaveBeenCalled()
    })

    it('each room object should use its own payload from the Proxy', async () => {
      const mockExecute = jest.fn()
      const mockNameCheck = jest.fn()
      const promise = new Promise((resolve) => {
        video.on('room.started', (room) => {
          expect(room.videoMute).toBeDefined()
          expect(room.videoUnmute).toBeDefined()
          expect(room.getMembers).toBeDefined()
          expect(room.subscribe).toBeDefined()

          room.on('event.here', jest.fn)
          room.execute = mockExecute
          room.subscribe()
          mockNameCheck(room.name)

          if (room.roomSessionId === 'session-two') {
            resolve(undefined)
          }
        })
      })

      video.subscribe()
      video.emit('video.room.started', firstRoom.params.params)

      video.emit('video.room.started', secondRoom.params.params)

      await promise

      expect(mockExecute).toHaveBeenCalledTimes(2)
      expect(mockExecute).toHaveBeenNthCalledWith(1, {
        method: 'signalwire.subscribe',
        params: {
          event_channel: eventChannelOne,
          events: ['video.event.here'],
        },
      })
      expect(mockExecute).toHaveBeenNthCalledWith(2, {
        method: 'signalwire.subscribe',
        params: {
          event_channel: eventChannelTwo,
          events: ['video.event.here'],
        },
      })

      // Check room.name exposed
      expect(mockNameCheck).toHaveBeenCalledTimes(2)
      expect(mockNameCheck).toHaveBeenNthCalledWith(1, 'First Room')
      expect(mockNameCheck).toHaveBeenNthCalledWith(2, 'Second Room')
    })
  })
})
