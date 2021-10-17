import { actions } from '@signalwire/core'
import { MessageConstructor } from '.'
import { configureFullStack } from '../testUtils'

describe('Message', () => {
  const { store, session, emitter } = configureFullStack()
  const Message = MessageConstructor({
    store,
    // events don't match
    // @ts-ignore
    emitter,
  })

  beforeEach(() => {
    emitter.removeAllListeners()
  })

  describe('.send() method', () => {
    it('should resolve message object', (done) => {
      const messageDeliveredEvent = JSON.parse(
        '{"jsonrpc":"2.0","id":"0c0bec13-1e5f-4cf7-9350-71cc5bff9c78","method":"signalwire.event","params":{"event_type":"messaging.state","space_id":"4827f42d-720f-47ef-bbc6-c05625186998","project_id":"75abe29b-c789-4c67-b3c7-c14d7371b5cb","context":"test-context","timestamp":1634448429.889162,"params":{"message_id":"mocked-message-uuid","context":"test-context","direction":"outbound","tags":["tag:mocked-uuid","uuid:mocked-uuid","message","outbound","SMS","test-context","+2222","+1111","relay-client"],"from_number":"+1111","to_number":"+2222","body":"hello there","media":[],"segments":1,"message_state":"delivered"}}}'
      )
      const message = new Message({
        to: '+1111',
        from: '+2222',
        body: 'test body',
        context: 'test-context',
        tags: ['tag1', 'tag2'],
        media: ['media/url/1', 'media/url/2'],
      })
      // @ts-ignore
      message.execute = jest.fn().mockResolvedValue({
        message_id: 'mocked-message-uuid',
        code: '200',
        message: 'message accepted',
      })

      message.send().then((result) => {
        expect(result).toBe(message)
        expect(message.execute).toHaveBeenLastCalledWith({
          method: 'messaging.send',
          params: {
            to_number: '+1111',
            from_number: '+2222',
            body: 'test body',
            context: 'test-context',
            tags: expect.arrayContaining(['tag1', 'tag2']),
            tag: 'mocked-uuid',
            media: ['media/url/1', 'media/url/2'],
          },
        })
        done()
      })

      session.dispatch(actions.socketMessageAction(messageDeliveredEvent))
    })
  })

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
    it('should receive queued, sent, delivered state events with the message object', (done) => {
      const message = new Message({
        to: '+2222',
        from: '+1111',
        body: 'test message',
        context: 'test-context',
      })
      const stateEventHandler = jest.fn()
      message.on('state', stateEventHandler)

      session.dispatch(actions.socketMessageAction(queuedEvent))
      expect(stateEventHandler).toHaveBeenNthCalledWith(1, message)
      expect(message.state).toBe('queued')

      session.dispatch(actions.socketMessageAction(sentEvent))
      expect(stateEventHandler).toHaveBeenNthCalledWith(2, message)
      expect(message.state).toBe('sent')

      session.dispatch(actions.socketMessageAction(deliveredEvent))
      expect(stateEventHandler).toHaveBeenNthCalledWith(3, message)
      expect(message.state).toBe('delivered')
      done()
    })

    it('should receive queued, sent, delivered state events with the message object', (done) => {
      const message = new Message({
        to: '+2222',
        from: '+1111',
        body: 'test message',
        context: 'test-context',
      })
      message.execute = jest.fn().mockResolvedValue({
        message_id: 'mocked-message-uuid',
        code: '200',
        message: 'message accepted',
      })
      const stateEventHandler = jest.fn()
      message.on('state', stateEventHandler)
      message.send().then(() => {
        expect(message.execute).toHaveBeenCalledWith({
          method: 'messaging.send',
          params: {
            to_number: '+2222',
            from_number: '+1111',
            body: 'test message',
            context: 'test-context',
            tag: 'mocked-uuid',
            tags: expect.anything(),
          },
        })
        done()
      })

      session.dispatch(actions.socketMessageAction(queuedEvent))
      expect(stateEventHandler).toHaveBeenNthCalledWith(1, message)
      expect(message.state).toBe('queued')

      session.dispatch(actions.socketMessageAction(sentEvent))
      expect(stateEventHandler).toHaveBeenNthCalledWith(2, message)
      expect(message.state).toBe('sent')

      session.dispatch(actions.socketMessageAction(deliveredEvent))
      expect(stateEventHandler).toHaveBeenNthCalledWith(3, message)
      expect(message.state).toBe('delivered')
    })

    it('should receive queued, failed, undelivered state events with the message object', (done) => {
      const message = new Message({
        to: '+2222',
        from: '+1111',
        body: 'test message',
        context: 'test-context',
      })
      message.execute = jest.fn().mockResolvedValue({
        message_id: 'mocked-message-uuid',
        code: '200',
        message: 'message accepted',
      })
      const stateEventHandler = jest.fn()
      message.on('state', stateEventHandler)
      message.send().then(() => {
        expect(message.execute).toHaveBeenCalledWith({
          method: 'messaging.send',
          params: {
            to_number: '+2222',
            from_number: '+1111',
            body: 'test message',
            context: 'test-context',
            tag: 'mocked-uuid',
            tags: expect.anything(),
          },
        })
        done()
      })

      session.dispatch(actions.socketMessageAction(queuedEvent))
      expect(stateEventHandler).toHaveBeenNthCalledWith(1, message)
      expect(message.state).toBe('queued')

      session.dispatch(actions.socketMessageAction(failedEvent))
      expect(stateEventHandler).toHaveBeenNthCalledWith(2, message)
      expect(message.state).toBe('failed')

      session.dispatch(actions.socketMessageAction(undeliveredEvent))
      expect(stateEventHandler).toHaveBeenNthCalledWith(3, message)
      expect(message.state).toBe('undelivered')
    })
  })
})
