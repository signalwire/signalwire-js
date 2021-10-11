import { configureFullStack } from '../testUtils'
import { Cantina, createCantinaObject } from '.'
import { actions } from '@signalwire/core'

describe('Cantina namespace', () => {
  let cantina: Cantina
  const { session, emitter, store } = configureFullStack()
  beforeEach(() => {
    emitter.removeAllListeners()
    cantina = createCantinaObject({
      store,
      // @ts-expect-error
      emitter,
    })
    // @ts-expect-error
    cantina.execute = jest.fn()
  })

  it('should not call execute without subscribed events', (done) => {
    cantina.subscribe()
    // @ts-expect-error
    expect(cantina.execute).not.toHaveBeenCalled()
    done()
  })

  it('should call execute with subscribed events', async () => {
    cantina.on('room.started', jest.fn)
    await cantina.subscribe()
    // @ts-expect-error
    expect(cantina.execute).toHaveBeenCalledWith({
      method: 'signalwire.subscribe',
      params: {
        event_channel: 'cantina-manager.rooms',
        events: ['cantina-manager.room.started'],
      },
    })
  })

  describe('cantina-manager.room.started event', () => {
    const firstRoom = JSON.parse(
      `{"jsonrpc":"2.0","id":"81e61d45-b7e3-4096-8221-f5d86ff98134","method":"signalwire.event","params":{"event_type":"cantina-manager.room.started","event_channel":"cantina-manager.rooms","timestamp":1631692502.1308,"params":{"id":"room-id","project_id":"project-id","cantina_id":"12382c06-280c-460f-8db2-c138c77d23e7","name":"room-one","preview":"https://preview.image.url","last_snapshot":"https://preview.video.url","member_count":1,"recording":false,"locked":false,"room_type":"permanent","visibility":"normal","room_description":"mocked-room-description","join_button":"mocked-join-button","order_priority":1,"custom_alone":"alone","custom_canvas":"canvas","custom_empty":"empty room","custom_preview":"https://preview.custom.url","has_sms_from_number":false,"auto_open_nav":false,"my_roles":["visitor","attendee"],"event_channel":"rooms.9b3ef3aa-6047-42aa-8d9d-6fca54211a47"}}}`
    )

    it('should pass RoomSession object to the handler', (done) => {
      cantina.on('room.started', (room) => {
        // @ts-expect-error
        expect(room.id).toBe('room-id')
        // @ts-expect-error
        expect(room.name).toBe('room-one')
        expect(room.audioMute).toBeDefined()
        expect(room.audioUnmute).toBeDefined()
        expect(room.videoMute).toBeDefined()
        expect(room.videoUnmute).toBeDefined()
        expect(room.deaf).toBeDefined()
        expect(room.undeaf).toBeDefined()
        expect(room.setInputVolume).toBeDefined()
        expect(room.setOutputVolume).toBeDefined()
        expect(room.setMicrophoneVolume).toBeDefined()
        expect(room.setSpeakerVolume).toBeDefined()
        expect(room.setInputSensitivity).toBeDefined()
        expect(room.removeMember).toBeDefined()
        expect(room.getMembers).toBeDefined()
        expect(room.getLayouts).toBeDefined()
        expect(room.setLayout).toBeDefined()
        expect(room.hideVideoMuted).toBeDefined()
        expect(room.showVideoMuted).toBeDefined()
        expect(room.getRecordings).toBeDefined()
        expect(room.startRecording).toBeDefined()
        done()
      })
      cantina.subscribe().then(() => {
        session.dispatch(actions.socketMessageAction(firstRoom))
      })
    })
  })

  describe('cantina-manager.room.updated event', () => {
    const firstRoom = JSON.parse(
      `{"jsonrpc":"2.0","id":"81e61d45-b7e3-4096-8221-f5d86ff98134","method":"signalwire.event","params":{"event_type":"cantina-manager.room.updated","event_channel":"cantina-manager.rooms","timestamp":1631692502.1308,"params":{"id":"room-id","project_id":"project-id","cantina_id":"12382c06-280c-460f-8db2-c138c77d23e7","name":"room-one","preview":"https://preview.image.url","last_snapshot":"https://preview.video.url","member_count":1,"recording":false,"locked":false,"room_type":"permanent","visibility":"normal","room_description":"mocked-room-description","join_button":"mocked-join-button","order_priority":1,"custom_alone":"alone","custom_canvas":"canvas","custom_empty":"empty room","custom_preview":"https://preview.custom.url","has_sms_from_number":false,"auto_open_nav":false,"my_roles":["visitor","attendee"],"event_channel":"rooms.9b3ef3aa-6047-42aa-8d9d-6fca54211a47"}}}`
    )

    it('should pass RoomSession object to the handler', (done) => {
      cantina.on('room.updated', (room) => {
        // @ts-expect-error
        expect(room.id).toBe('room-id')
        // @ts-expect-error
        expect(room.name).toBe('room-one')
        expect(room.audioMute).toBeDefined()
        expect(room.audioUnmute).toBeDefined()
        expect(room.videoMute).toBeDefined()
        expect(room.videoUnmute).toBeDefined()
        expect(room.deaf).toBeDefined()
        expect(room.undeaf).toBeDefined()
        expect(room.setInputVolume).toBeDefined()
        expect(room.setOutputVolume).toBeDefined()
        expect(room.setMicrophoneVolume).toBeDefined()
        expect(room.setSpeakerVolume).toBeDefined()
        expect(room.setInputSensitivity).toBeDefined()
        expect(room.removeMember).toBeDefined()
        expect(room.getMembers).toBeDefined()
        expect(room.getLayouts).toBeDefined()
        expect(room.setLayout).toBeDefined()
        expect(room.hideVideoMuted).toBeDefined()
        expect(room.showVideoMuted).toBeDefined()
        expect(room.getRecordings).toBeDefined()
        expect(room.startRecording).toBeDefined()
        done()
      })
      cantina.subscribe().then(() => {
        session.dispatch(actions.socketMessageAction(firstRoom))
      })
    })
  })

  describe('cantina-manager.room.ended event', () => {
    const firstRoom = JSON.parse(
      `{"jsonrpc":"2.0","id":"81e61d45-b7e3-4096-8221-f5d86ff98134","method":"signalwire.event","params":{"event_type":"cantina-manager.room.ended","event_channel":"cantina-manager.rooms","timestamp":1631692502.1308,"params":{"id":"room-id","project_id":"project-id","cantina_id":"12382c06-280c-460f-8db2-c138c77d23e7","name":"room-one","preview":"https://preview.image.url","last_snapshot":"https://preview.video.url","member_count":1,"recording":false,"locked":false,"room_type":"permanent","visibility":"normal","room_description":"mocked-room-description","join_button":"mocked-join-button","order_priority":1,"custom_alone":"alone","custom_canvas":"canvas","custom_empty":"empty room","custom_preview":"https://preview.custom.url","has_sms_from_number":false,"auto_open_nav":false,"my_roles":["visitor","attendee"],"event_channel":"rooms.9b3ef3aa-6047-42aa-8d9d-6fca54211a47"}}}`
    )

    it('should pass RoomSession object to the handler', (done) => {
      cantina.on('room.ended', (room) => {
        // @ts-expect-error
        expect(room.id).toBe('room-id')
        // @ts-expect-error
        expect(room.name).toBe('room-one')
        expect(room.audioMute).toBeDefined()
        expect(room.audioUnmute).toBeDefined()
        expect(room.videoMute).toBeDefined()
        expect(room.videoUnmute).toBeDefined()
        expect(room.deaf).toBeDefined()
        expect(room.undeaf).toBeDefined()
        expect(room.setInputVolume).toBeDefined()
        expect(room.setOutputVolume).toBeDefined()
        expect(room.setMicrophoneVolume).toBeDefined()
        expect(room.setSpeakerVolume).toBeDefined()
        expect(room.setInputSensitivity).toBeDefined()
        expect(room.removeMember).toBeDefined()
        expect(room.getMembers).toBeDefined()
        expect(room.getLayouts).toBeDefined()
        expect(room.setLayout).toBeDefined()
        expect(room.hideVideoMuted).toBeDefined()
        expect(room.showVideoMuted).toBeDefined()
        expect(room.getRecordings).toBeDefined()
        expect(room.startRecording).toBeDefined()
        done()
      })
      cantina.subscribe().then(() => {
        session.dispatch(actions.socketMessageAction(firstRoom))
      })
    })
  })
})