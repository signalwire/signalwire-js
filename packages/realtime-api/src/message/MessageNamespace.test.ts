import { actions } from '@signalwire/core'
import { createMessageNamespace, MessageComponent } from '.'
import { configureFullStack } from '../testUtils'

describe('MessageNamespace', () => {
  const { store, session, emitter } = configureFullStack()
  const messageNamespace = createMessageNamespace({
    store,
    // @ts-ignore
    emitter,
  })

  beforeEach(() => {
    emitter.removeAllListeners()
    messageNamespace.removeAllListeners()
  })

  describe('Message constructor', () => {
    it('should have Message constructor property', () => {
      expect(messageNamespace.Message).toBeDefined()
      const message = new messageNamespace.Message({
        to: '+2222',
        from: '+1111',
        body: 'test message',
        context: 'test-context',
      })
      expect(message).toBeInstanceOf(MessageComponent)
      expect(message.to).toBe('+2222')
      expect(message.from).toBe('+1111')
      expect(message.body).toBe('test message')
      expect(message.context).toBe('test-context')
    })
  })

  describe('events', () => {
    describe('state event', () => {
      const queuedEvent = JSON.parse(
        '{"jsonrpc":"2.0","id":"0c0bec13-1e5f-4cf7-9350-71cc5bff9c78","method":"signalwire.event","params":{"event_type":"messaging.state","space_id":"4827f42d-720f-47ef-bbc6-c05625186998","project_id":"75abe29b-c789-4c67-b3c7-c14d7371b5cb","context":"test-context","timestamp":1634448429.889162,"params":{"message_id":"mocked-message-uuid","context":"test-context","direction":"outbound","tags":["tag:mocked-uuid","uuid:mocked-uuid","message","outbound","SMS","test-context","+2222","+1111","relay-client"],"from_number":"+1111","to_number":"+2222","body":"test message","media":[],"segments":1,"message_state":"queued"}}}'
      )
      const sentEvent = JSON.parse(
        '{"jsonrpc":"2.0","id":"0c0bec13-1e5f-4cf7-9350-71cc5bff9c78","method":"signalwire.event","params":{"event_type":"messaging.state","space_id":"4827f42d-720f-47ef-bbc6-c05625186998","project_id":"75abe29b-c789-4c67-b3c7-c14d7371b5cb","context":"test-context","timestamp":1634448429.889162,"params":{"message_id":"mocked-message-uuid","context":"test-context","direction":"outbound","tags":["tag:mocked-uuid","uuid:mocked-uuid","message","outbound","SMS","test-context","+2222","+1111","relay-client"],"from_number":"+1111","to_number":"+2222","body":"test message","media":[],"segments":1,"message_state":"sent"}}}'
      )
      const deliveredEvent = JSON.parse(
        '{"jsonrpc":"2.0","id":"0c0bec13-1e5f-4cf7-9350-71cc5bff9c78","method":"signalwire.event","params":{"event_type":"messaging.state","space_id":"4827f42d-720f-47ef-bbc6-c05625186998","project_id":"75abe29b-c789-4c67-b3c7-c14d7371b5cb","context":"test-context","timestamp":1634448429.889162,"params":{"message_id":"mocked-message-uuid","context":"test-context","direction":"outbound","tags":["tag:mocked-uuid","uuid:mocked-uuid","message","outbound","SMS","test-context","+2222","+1111","relay-client"],"from_number":"+1111","to_number":"+2222","body":"test message","media":[],"segments":1,"message_state":"delivered"}}}'
      )
      const failedEvent = JSON.parse(
        '{"jsonrpc":"2.0","id":"0c0bec13-1e5f-4cf7-9350-71cc5bff9c78","method":"signalwire.event","params":{"event_type":"messaging.state","space_id":"4827f42d-720f-47ef-bbc6-c05625186998","project_id":"75abe29b-c789-4c67-b3c7-c14d7371b5cb","context":"test-context","timestamp":1634448429.889162,"params":{"message_id":"mocked-message-uuid","context":"test-context","direction":"outbound","tags":["tag:mocked-uuid","uuid:mocked-uuid","message","outbound","SMS","test-context","+2222","+1111","relay-client"],"from_number":"+1111","to_number":"+2222","body":"test message","media":[],"segments":1,"message_state":"failed"}}}'
      )
      const undeliveredEvent = JSON.parse(
        '{"jsonrpc":"2.0","id":"0c0bec13-1e5f-4cf7-9350-71cc5bff9c78","method":"signalwire.event","params":{"event_type":"messaging.state","space_id":"4827f42d-720f-47ef-bbc6-c05625186998","project_id":"75abe29b-c789-4c67-b3c7-c14d7371b5cb","context":"test-context","timestamp":1634448429.889162,"params":{"message_id":"mocked-message-uuid","context":"test-context","direction":"outbound","tags":["tag:mocked-uuid","uuid:mocked-uuid","message","outbound","SMS","test-context","+2222","+1111","relay-client"],"from_number":"+1111","to_number":"+2222","body":"test message","media":[],"segments":1,"message_state":"undelivered"}}}'
      )
      it('should receive state event for messages with state: "queue", and message object', (done) => {
        messageNamespace.on('state', (message) => {
          expect(message.id).toBe('mocked-message-uuid')
          expect(message.to).toBe('+2222')
          expect(message.from).toBe('+1111')
          expect(message.body).toBe('test message')
          expect(message.state).toBe('queued')
          expect(message.context).toBe('test-context')
          done()
        })
        session.dispatch(actions.socketMessageAction(queuedEvent))
      })

      it('should receive state event for messages with state: "sent", and message object',(done) => {
        messageNamespace.on('state', (message) => {
          expect(message.id).toBe('mocked-message-uuid')
          expect(message.to).toBe('+2222')
          expect(message.from).toBe('+1111')
          expect(message.body).toBe('test message')
          expect(message.state).toBe('sent')
          expect(message.context).toBe('test-context')
          done()
        })
        session.dispatch(actions.socketMessageAction(sentEvent))
      })

      it('should receive state event for messages with state: "delivered", and message object', (done) => {
        messageNamespace.on('state', (message) => {
          expect(message.id).toBe('mocked-message-uuid')
          expect(message.to).toBe('+2222')
          expect(message.from).toBe('+1111')
          expect(message.body).toBe('test message')
          expect(message.state).toBe('delivered')
          expect(message.context).toBe('test-context')
          done()
        })
        session.dispatch(actions.socketMessageAction(deliveredEvent))
      })

      it('should receive state event for messages with state: "failed", and message object', (done) => {
        messageNamespace.on('state', (message) => {
          expect(message.id).toBe('mocked-message-uuid')
          expect(message.to).toBe('+2222')
          expect(message.from).toBe('+1111')
          expect(message.body).toBe('test message')
          expect(message.state).toBe('failed')
          expect(message.context).toBe('test-context')
          done()
        })
        session.dispatch(actions.socketMessageAction(failedEvent))
      })

      it('should receive state event for messages with state: "undelivered", and message object', (done) => {
        messageNamespace.on('state', (message) => {
          expect(message.id).toBe('mocked-message-uuid')
          expect(message.to).toBe('+2222')
          expect(message.from).toBe('+1111')
          expect(message.body).toBe('test message')
          expect(message.state).toBe('undelivered')
          expect(message.context).toBe('test-context')
          done()
        })
        session.dispatch(actions.socketMessageAction(undeliveredEvent))
      })
    })

    describe('receive event', () => {
      const receiveEvent = JSON.parse(
        '{"jsonrpc":"2.0","id":"50536846-f664-4060-bdd4-301cf95e54f3","method":"signalwire.event","params":{"event_type":"messaging.receive","space_id":"4827f42d-720f-47ef-bbc6-c05625186998","project_id":"75abe29b-c789-4c67-b3c7-c14d7371b5cb","context":"test-context","timestamp":1634450988.1005094,"params":{"message_id":"mocked-message-uuid","context":"test-context","direction":"inbound","tags":["message","inbound","SMS","default","+2222","+1111","relay-client"],"from_number":"+1111","to_number":"+2222","body":"test message","media":null,"segments":1,"message_state":"received"}}}'
      )
      it('should receive "receive" events with message object', (done) => {
        messageNamespace.on('receive', (message) => {
          expect(message.id).toBe('mocked-message-uuid')
          expect(message.to).toBe('+2222')
          expect(message.from).toBe('+1111')
          expect(message.body).toBe('test message')
          expect(message.state).toBe('received')
          expect(message.context).toBe('test-context')
          done()
        })
        session.dispatch(actions.socketMessageAction(receiveEvent))
      })
    })
  })
})
