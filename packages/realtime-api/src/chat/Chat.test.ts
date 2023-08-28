import { EventEmitter } from '@signalwire/core'
import { Chat } from './Chat'
import { createClient } from '../client/createClient'

describe('Chat', () => {
  let chat: Chat
  const userOptions = {
    host: 'example.com',
    project: 'example.project',
    token: 'example.token',
  }
  const swClientMock = {
    userOptions,
    client: createClient(userOptions),
  }

  beforeEach(() => {
    //@ts-expect-error
    chat = new Chat(swClientMock)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should have an event emitter', () => {
    expect(chat['emitter']).toBeInstanceOf(EventEmitter)
  })

  it('should declare the correct event map', () => {
    const expectedEventMap = {
      onMessageReceived: 'chat.message',
      onMemberJoined: 'chat.member.joined',
      onMemberUpdated: 'chat.member.updated',
      onMemberLeft: 'chat.member.left',
    }
    expect(chat['_eventMap']).toEqual(expectedEventMap)
  })
})
