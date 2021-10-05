import { actions } from '@signalwire/core'
import { configureFullStack } from '../testUtils'
import { createMessageObject, MessageComponent } from './Message'

describe('Message Object', () => {
  let message: MessageComponent
  const { emitter, store, session } = configureFullStack()
  const messageStateEvent = JSON.parse(
    `{"jsonrpc":"2.0","id":"cf181f37-9e5b-4d10-953f-1a027f9743a6","method":"signalwire.event","params":{"event_type":"messaging.state","context":"test-context","timestamp":123457.1234,"space_id":"b0531f1e-c8e2-4778-832a-b2417576658f","project_id":"a0bcbb14-ec50-4e50-98b1-fd426d09dde5","params":{"message_id":"message-uuid","context":"test-context","direction":"outbound","tags":["tag1","tag2"],"from_number":"+2222","to_number":"+1111","body":"test body","segments":1,"message_state":"delivered"}}}`
    )

  const messageUndeliveredEvent = JSON.parse(
    `{"jsonrpc":"2.0","id":"cf181f37-9e5b-4d10-953f-1a027f9743a6","method":"signalwire.event","params":{"event_type":"messaging.state","context":"test-context","timestamp":123457.1234,"space_id":"b0531f1e-c8e2-4778-832a-b2417576658f","project_id":"a0bcbb14-ec50-4e50-98b1-fd426d09dde5","params":{"message_id":"message-uuid","context":"test-context","direction":"outbound","tags":["tag1","tag2"],"from_number":"+2222","to_number":"+1111","body":"test body","segments":1,"message_state":"undelivered"}}}`
    )
  
  const messageQueuedEvent = JSON.parse(
    `{"jsonrpc":"2.0","id":"cf181f37-9e5b-4d10-953f-1a027f9743a6","method":"signalwire.event","params":{"event_type":"messaging.state","context":"test-context","timestamp":123457.1234,"space_id":"b0531f1e-c8e2-4778-832a-b2417576658f","project_id":"a0bcbb14-ec50-4e50-98b1-fd426d09dde5","params":{"message_id":"message-uuid","context":"test-context","direction":"outbound","tags":["tag1","tag2"],"from_number":"+2222","to_number":"+1111","body":"test body","segments":1,"message_state":"queued"}}}`
    )

  beforeEach(() => {
    emitter.removeAllListeners()
    message = createMessageObject({
      // @ts-expect-error
      emitter,
      store
    })
    message.execute = jest.fn().mockResolvedValue({
      message_id: 'message-uuid',
      code: '200',
      message: 'messsage accepted'
    })
  })

  it('should have all MessageAPI methods', (done) => {
    expect(message.send).toBeDefined()
    expect(message.sendSMS).toBeDefined()
    expect(message.sendMMS).toBeDefined()
    done()
  })

  describe('.send() method', () => {
    it('should resolve a message obj', (done) => {
      const promise = message.send({
        type: 'sms',
        context: 'test-context',
        body: 'test body',
        tags: ['tag1', 'tag2'],
        to: '+1111',
        from: '+2222',
      })

      expect(message.execute).toHaveBeenCalledWith({
        method: 'messaging.send',
        params: {
          context: 'test-context',
          body: 'test body',
          tags: ['tag1', 'tag2'],
          to_number: '+1111',
          from_number: '+2222'
        }
      })

      promise.then(messageObj => {
        expect(messageObj.id).toBe('message-uuid')
        expect(messageObj.body).toBe('test body')
        expect(messageObj.tags).toEqual(['tag1', 'tag2'])
        expect(messageObj.to).toBe('+1111')
        expect(messageObj.from).toBe('+2222')
        expect(messageObj.context).toBe('test-context')
        done()
      })
      // TODO: figure out better way to tiggger event
      setTimeout(() => session.dispatch(actions.socketMessageAction(messageStateEvent)), 100)
    })


    // failed will always send undelivered 
    it('should resolve on message undelivered', (done) => {
      const promise = message.send({
        type: 'sms',
        context: 'test-context',
        body: 'test body',
        tags: ['tag1', 'tag2'],
        to: '+1111',
        from: '+2222',
      })

      expect(message.execute).toHaveBeenCalledWith({
        method: 'messaging.send',
        params: {
          context: 'test-context',
          body: 'test body',
          tags: ['tag1', 'tag2'],
          to_number: '+1111',
          from_number: '+2222'
        }
      })

      promise.then(messageObj => {
        expect(messageObj.id).toBe('message-uuid')
        expect(messageObj.body).toBe('test body')
        expect(messageObj.tags).toEqual(['tag1', 'tag2'])
        expect(messageObj.to).toBe('+1111')
        expect(messageObj.from).toBe('+2222')
        expect(messageObj.context).toBe('test-context')
        expect(messageObj.delivered).toBeFalsy()
        expect(messageObj.state).toBe('undelivered')
        done()
      })
      // TODO: figure out better way to tiggger event
      setTimeout(() => session.dispatch(actions.socketMessageAction(messageUndeliveredEvent)), 100)

    })

    it('should not resovle on state others then delivered and undelivered', (done) => {
      const mockedHandler = jest.fn()
      message.send({
        type: 'sms',
        context: 'test-context',
        body: 'test body',
        tags: ['tag1', 'tag2'],
        to: '+1111',
        from: '+2222',
      }).then(mockedHandler)

      // TODO: figure out better way to tiggger event
      setTimeout(() => {
        session.dispatch(actions.socketMessageAction(messageQueuedEvent))
        expect(mockedHandler).not.toHaveBeenCalled()
        done()
      }, 100)
    })
  })

  describe('.sendSMS() method', () => {
    it('should resolve a message obj', (done) => {
      const promise = message.sendSMS({
        context: 'test-context',
        body: 'test body',
        tags: ['tag1', 'tag2'],
        to: '+1111',
        from: '+2222',
      })

      expect(message.execute).toHaveBeenCalledWith({
        method: 'messaging.send',
        params: {
          context: 'test-context',
          body: 'test body',
          tags: ['tag1', 'tag2'],
          to_number: '+1111',
          from_number: '+2222'
        }
      })

      promise.then(messageObj => {
        expect(messageObj.id).toBe('message-uuid')
        expect(messageObj.body).toBe('test body')
        expect(messageObj.tags).toEqual(['tag1', 'tag2'])
        expect(messageObj.to).toBe('+1111')
        expect(messageObj.from).toBe('+2222')
        expect(messageObj.context).toBe('test-context')
        done()
      })
      // TODO: figure out better way to tiggger event
      setTimeout(() => session.dispatch(actions.socketMessageAction(messageStateEvent)), 100)
    })
  })

  describe('.sendMMS() method', () => {
    const messageStateEvent = JSON.parse(
      `{"jsonrpc":"2.0","id":"cf181f37-9e5b-4d10-953f-1a027f9743a6","method":"signalwire.event","params":{"event_type":"messaging.state","context":"test-context","timestamp":123457.1234,"space_id":"b0531f1e-c8e2-4778-832a-b2417576658f","project_id":"a0bcbb14-ec50-4e50-98b1-fd426d09dde5","params":{"message_id":"message-uuid","context":"test-context","direction":"outbound","tags":["tag1","tag2"],"media": ["media/url/1", "media/url/2"],"from_number":"+2222","to_number":"+1111","body":"test body","segments":1,"message_state":"delivered"}}}`
      )
    it('should resolve a message obj', (done) => {
      const promise = message.sendMMS({
        context: 'test-context',
        body: 'test body',
        media: ['media/url/1', 'media/url/2'],
        tags: ['tag1', 'tag2'],
        to: '+1111',
        from: '+2222',
      })

      expect(message.execute).toHaveBeenCalledWith({
        method: 'messaging.send',
        params: {
          context: 'test-context',
          body: 'test body',
          tags: ['tag1', 'tag2'],
          media: ['media/url/1', 'media/url/2'],
          to_number: '+1111',
          from_number: '+2222'
        }
      })

      promise.then(messageObj => {
        expect(messageObj.id).toBe('message-uuid')
        expect(messageObj.body).toBe('test body')
        expect(messageObj.tags).toEqual(['tag1', 'tag2'])
        expect(messageObj.media).toEqual(['media/url/1', 'media/url/2'])
        expect(messageObj.to).toBe('+1111')
        expect(messageObj.from).toBe('+2222')
        expect(messageObj.context).toBe('test-context')
        done()
      })
      // TODO: figure out better way to tiggger event
      setTimeout(() => session.dispatch(actions.socketMessageAction(messageStateEvent)), 100)
    })
  })

  describe('messaging.receive event', () => {
    const messageReceiveEvent = JSON.parse(
      `{"jsonrpc":"2.0","id":"cf181f37-9e5b-4d10-953f-1a027f9743a6","method":"signalwire.event","params":{"event_type":"messaging.receive","context":"test-context","timestamp":123457.1234,"space_id":"b0531f1e-c8e2-4778-832a-b2417576658f","project_id":"a0bcbb14-ec50-4e50-98b1-fd426d09dde5","params":{"message_id":"message-uuid","context":"test-context","direction":"inbound","tags":["tag1","tag2"],"from_number":"+2222","to_number":"+1111","body":"test body","segments":1,"message_state":"received"}}}`
    )
    it('should receive messaging.receive events', (done) => {
      let mockedCallback = jest.fn()
      message.on('receive', mockedCallback)
      session.dispatch(actions.socketMessageAction(messageReceiveEvent))
      expect(mockedCallback).toHaveBeenCalledTimes(1)
      done()
    })
  })

  describe('messaging.state event', () => {
    it('should receive messaging.state events', (done) => {
      let mockedCallback = jest.fn()
      message.on('state', mockedCallback)
      session.dispatch(actions.socketMessageAction(messageStateEvent))
      expect(mockedCallback).toHaveBeenCalledTimes(1)
      done()
    })
  })
})