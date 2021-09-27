import { actions } from '@signalwire/core'
import { configureFullStack } from '../testUtils'
import { createVideoObject, Video } from './Video'

describe('Video Object', () => {
  let video: Video

  const { store, session, emitter } = configureFullStack()
  beforeEach(() => {
    // remove all listeners before each run
    emitter.removeAllListeners()

    video = createVideoObject({
      store,
      // @ts-expect-error
      emitter,
    })
    // @ts-expect-error
    video.execute = jest.fn()
  })

  it('should not invoke execute without event listeners', async () => {
    await video.subscribe()
    // @ts-expect-error
    expect(video.execute).not.toHaveBeenCalled()
  })

  it('should invoke execute with event listeners', async () => {
    video.on('room.started', jest.fn)
    await video.subscribe()
    // @ts-expect-error
    expect(video.execute).toHaveBeenCalledWith({
      method: 'signalwire.subscribe',
      params: {
        get_initial_state: true,
        event_channel: 'video.rooms',
        events: ['video.room.started'],
      },
    })
  })

  describe('video.room.started event', () => {
    const eventChannelOne = 'room.<uuid-one>'
    const firstRoom = JSON.parse(
      `{"jsonrpc":"2.0","id":"uuid1","method":"signalwire.event","params":{"params":{"room":{"recording":false,"room_session_id":"session-one","name":"First Room","hide_video_muted":false,"music_on_hold":false,"room_id":"room_id","event_channel":"${eventChannelOne}"},"room_session_id":"session-one","room_id":"room_id","room_session":{"recording":false,"name":"First Room","hide_video_muted":false,"id":"session-one","music_on_hold":false,"room_id":"room_id","event_channel":"${eventChannelOne}"}},"timestamp":1631692502.1308,"event_type":"video.room.started","event_channel":"video.rooms.4b7ae78a-d02e-4889-a63b-08b156d5916e"}}`
    )
    const eventChannelTwo = 'room.<uuid-one>'
    const secondRoom = JSON.parse(
      `{"jsonrpc":"2.0","id":"uuid1","method":"signalwire.event","params":{"params":{"room":{"recording":false,"room_session_id":"session-two","name":"Second Room","hide_video_muted":false,"music_on_hold":false,"room_id":"room_id","event_channel":"${eventChannelTwo}"},"room_session_id":"session-two","room_id":"room_id","room_session":{"recording":false,"name":"Second Room","hide_video_muted":false,"id":"session-two","music_on_hold":false,"room_id":"room_id","event_channel":"${eventChannelTwo}"}},"timestamp":1631692502.1308,"event_type":"video.room.started","event_channel":"video.rooms.4b7ae78a-d02e-4889-a63b-08b156d5916e"}}`
    )

    it('should pass a Room obj to the handler', (done) => {
      video.on('room.started', (room) => {
        expect(room.id).toBe('session-one')
        expect(room.name).toBe('First Room')
        expect(room.videoMute).toBeDefined()
        expect(room.videoUnmute).toBeDefined()
        expect(room.getMembers).toBeDefined()
        expect(room.subscribe).toBeDefined()
        done()
      })

      video.subscribe().then(() => {
        session.dispatch(actions.socketMessageAction(firstRoom))
      })
    })

    it('should destroy the cached obj when an event has no longer handlers attached', async () => {
      const destroyer = jest.fn()
      const h = (room: any) => {
        room._destroyer = destroyer
      }
      video.on('room.started', h)

      await video.subscribe()
      session.dispatch(actions.socketMessageAction(firstRoom))

      video.off('room.started', h)
      expect(destroyer).toHaveBeenCalled()
    })

    it('should *not* destroy the cached obj when there are existing listeners attached', async () => {
      const destroyer = jest.fn()
      const h = (room: any) => {
        room._destroyer = destroyer
      }
      video.on('room.started', h)
      video.on('room.started', () => {})

      await video.subscribe()
      session.dispatch(actions.socketMessageAction(firstRoom))

      video.off('room.started', h)
      expect(destroyer).not.toHaveBeenCalled()
    })

    it('should destroy the cached obj when .off is called with no handler', async () => {
      const destroyer = jest.fn()
      const h = (room: any) => {
        room._destroyer = destroyer
      }
      video.on('room.started', h)
      video.on('room.started', () => {})
      video.on('room.started', () => {})

      await video.subscribe()
      session.dispatch(actions.socketMessageAction(firstRoom))

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

          room.on('member.updated.audioMuted', jest.fn)
          // @ts-expect-error
          room.execute = mockExecute
          room.subscribe()
          mockNameCheck(room.name)

          if (room.id === 'session-two') {
            resolve(undefined)
          }
        })
      })

      await video.subscribe()

      session.dispatch(actions.socketMessageAction(firstRoom))
      session.dispatch(actions.socketMessageAction(secondRoom))

      await promise

      expect(mockExecute).toHaveBeenCalledTimes(2)
      expect(mockExecute).toHaveBeenNthCalledWith(1, {
        method: 'signalwire.subscribe',
        params: {
          get_initial_state: true,
          event_channel: eventChannelOne,
          events: ['video.member.updated', 'video.room.subscribed'],
        },
      })
      expect(mockExecute).toHaveBeenNthCalledWith(2, {
        method: 'signalwire.subscribe',
        params: {
          get_initial_state: true,
          event_channel: eventChannelTwo,
          events: ['video.member.updated', 'video.room.subscribed'],
        },
      })

      // Check room.name exposed
      expect(mockNameCheck).toHaveBeenCalledTimes(2)
      expect(mockNameCheck).toHaveBeenNthCalledWith(1, 'First Room')
      expect(mockNameCheck).toHaveBeenNthCalledWith(2, 'Second Room')
    })
  })

  describe('video.room.ended event', () => {
    const roomEndedEvent = JSON.parse(
      `{"jsonrpc":"2.0","id":"uuid2","method":"signalwire.event","params":{"params":{"room":{"recording":false,"room_session_id":"session-one","name":"First Room","hide_video_muted":false,"music_on_hold":false,"room_id":"room_id","event_channel":"room.<uuid-one>"},"room_session_id":"session-one","room_id":"room_id","room_session":{"recording":false,"name":"First Room","hide_video_muted":false,"id":"session-one","music_on_hold":false,"room_id":"room_id","event_channel":"room.<uuid-one>"}},"timestamp":1631692510.415,"event_type":"video.room.ended","event_channel":"video.rooms.4b7ae78a-d02e-4889-a63b-08b156d5916e"}}`
    )

    it('should pass a Room obj to the handler', (done) => {
      video.on('room.ended', (room) => {
        expect(room.id).toBe('session-one')
        expect(room.name).toBe('First Room')
        expect(room.videoMute).toBeDefined()
        expect(room.videoUnmute).toBeDefined()
        expect(room.getMembers).toBeDefined()
        expect(room.subscribe).toBeDefined()
        done()
      })

      video.subscribe().then(() => {
        session.dispatch(actions.socketMessageAction(roomEndedEvent))
      })
    })
  })
})
