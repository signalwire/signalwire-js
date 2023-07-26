import { configureFullStack } from '../testUtils'
import { VideoManager, createVideoManagerObject } from '.'
import { actions } from '@signalwire/core'

describe('VideoManager namespace', () => {
  let manager: VideoManager
  let fullStack: ReturnType<typeof configureFullStack>

  beforeEach(() => {
    fullStack = configureFullStack()
    fullStack.emitter.removeAllListeners()
    manager = createVideoManagerObject({
      store: fullStack.store,
      // @ts-expect-error
      emitter: fullStack.emitter,
    })
    // @ts-expect-error
    manager.execute = jest.fn()
  })

  afterEach(() => {
    fullStack.destroy()
  })

  it('should not call execute without subscribed events', () => {
    manager.subscribe()
    // @ts-expect-error
    expect(manager.execute).not.toHaveBeenCalled()
  })

  it('should call execute with subscribed events', async () => {
    manager.on('room.started', jest.fn)
    await manager.subscribe()
    // @ts-expect-error
    expect(manager.execute).toHaveBeenCalledWith({
      method: 'signalwire.subscribe',
      params: {
        event_channel: 'video-manager.rooms',
        events: ['video-manager.room.started'],
      },
    })
  })

  describe('video-manager.room.started event', () => {
    const firstRoom = JSON.parse(
      `{"jsonrpc":"2.0","id":"81e61d45-b7e3-4096-8221-f5d86ff98134","method":"signalwire.event","params":{"event_type":"video-manager.room.started","event_channel":"video-manager.rooms","timestamp":1631692502.1308,"params":{"id":"room-id","project_id":"project-id","cantina_id":"12382c06-280c-460f-8db2-c138c77d23e7","name":"room-one","preview":"https://preview.image.url","last_snapshot":"https://preview.video.url","member_count":1,"recording":false,"locked":false,"room_type":"permanent","visibility":"normal","room_description":"mocked-room-description","join_button":"mocked-join-button","order_priority":1,"custom_alone":"alone","custom_canvas":"canvas","custom_empty":"empty room","custom_preview":"https://preview.custom.url","has_sms_from_number":false,"auto_open_nav":false,"my_roles":["visitor","attendee"],"event_channel":"rooms.9b3ef3aa-6047-42aa-8d9d-6fca54211a47"}}}`
    )

    it('should pass RoomSession object to the handler', (done) => {
      manager.on('room.started', (room) => {
        expect(room.id).toBe('room-id')
        expect(room.name).toBe('room-one')
        expect(room.memberCount).toBe(1)
        done()
      })
      manager.subscribe().then(() => {
        fullStack.session.dispatch(actions.socketMessageAction(firstRoom))
      })
    })
  })

  describe('video-manager.room.updated event', () => {
    const firstRoom = JSON.parse(
      `{"jsonrpc":"2.0","id":"81e61d45-b7e3-4096-8221-f5d86ff98134","method":"signalwire.event","params":{"event_type":"video-manager.room.started","event_channel":"video-manager.rooms","timestamp":1631692502.1308,"params":{"id":"room-id","project_id":"project-id","cantina_id":"12382c06-280c-460f-8db2-c138c77d23e7","name":"room-one","preview":"https://preview.image.url","last_snapshot":"https://preview.video.url","member_count":1,"recording":false,"locked":false,"room_type":"permanent","visibility":"normal","room_description":"mocked-room-description","join_button":"mocked-join-button","order_priority":1,"custom_alone":"alone","custom_canvas":"canvas","custom_empty":"empty room","custom_preview":"https://preview.custom.url","has_sms_from_number":false,"auto_open_nav":false,"my_roles":["visitor","attendee"],"event_channel":"rooms.9b3ef3aa-6047-42aa-8d9d-6fca54211a47"}}}`
    )

    it('should pass RoomSession object to the handler', (done) => {
      manager.on('room.started', (room) => {
        expect(room.id).toBe('room-id')
        expect(room.name).toBe('room-one')
        expect(room.memberCount).toBe(1)
        done()
      })
      manager.subscribe().then(() => {
        fullStack.session.dispatch(actions.socketMessageAction(firstRoom))
      })
    })
  })

  describe('video-manager.room.ended event', () => {
    const firstRoom = JSON.parse(
      `{"jsonrpc":"2.0","id":"81e61d45-b7e3-4096-8221-f5d86ff98134","method":"signalwire.event","params":{"event_type":"video-manager.room.ended","event_channel":"video-manager.rooms","timestamp":1631692502.1308,"params":{"id":"room-id","project_id":"project-id","cantina_id":"12382c06-280c-460f-8db2-c138c77d23e7","name":"room-one","preview":"https://preview.image.url","last_snapshot":"https://preview.video.url","member_count":1,"recording":false,"locked":false,"room_type":"permanent","visibility":"normal","room_description":"mocked-room-description","join_button":"mocked-join-button","order_priority":1,"custom_alone":"alone","custom_canvas":"canvas","custom_empty":"empty room","custom_preview":"https://preview.custom.url","has_sms_from_number":false,"auto_open_nav":false,"my_roles":["visitor","attendee"],"event_channel":"rooms.9b3ef3aa-6047-42aa-8d9d-6fca54211a47"}}}`
    )

    it('should pass RoomSession object to the handler', (done) => {
      manager.on('room.ended', (room) => {
        expect(room.id).toBe('room-id')
        expect(room.name).toBe('room-one')
        expect(room.memberCount).toBe(1)
        done()
      })
      manager.subscribe().then(() => {
        fullStack.session.dispatch(actions.socketMessageAction(firstRoom))
      })
    })
  })
})
