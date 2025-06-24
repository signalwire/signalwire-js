import { SignalWire } from './SignalWire'
import { HTTPClient } from './HTTPClient'
import { WSClient } from './WSClient'
import { Conversation } from '@signalwire/browser-js/src/Conversation'

jest.mock('./HTTPClient')
jest.mock('./WSClient')
jest.mock('@signalwire/browser-js/src/Conversation')

describe('SignalWire', () => {
  const mockParams = {
    host: 'mock-host',
    token: 'mock-token',
  }

  let mockConnect: jest.Mock
  let mockDisconnect: jest.Mock

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()

    mockConnect = jest.fn()
    mockDisconnect = jest.fn()

    // Mock WSClient behavior
    ;(WSClient as jest.Mock).mockImplementation(() => ({
      connect: mockConnect,
      disconnect: mockDisconnect,
      online: jest.fn(),
      offline: jest.fn(),
      dial: jest.fn(),
      reattach: jest.fn(),
      handlePushNotification: jest.fn(),
      updateToken: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    }))

    // Mock HTTPClient behavior
    ;(HTTPClient as jest.Mock).mockImplementation(() => ({
      registerDevice: jest.fn(),
      unregisterDevice: jest.fn(),
      getSubscriberInfo: jest.fn(),
      getAddresses: jest.fn(),
      getAddress: jest.fn(),
    }))

    // Mock Conversation behavior
    ;(Conversation as jest.Mock).mockImplementation(() => ({
      getConversations: jest.fn(),
      getMessages: jest.fn(),
      getConversationMessages: jest.fn(),
      subscribe: jest.fn(),
      sendMessage: jest.fn(),
      joinConversation: jest.fn(),
      getChatMessages: jest.fn(),
      subscribeChatMessages: jest.fn(),
    }))
  })

  it('should create a single instance on the first call', async () => {
    const client1 = await SignalWire(mockParams)
    const client2 = await SignalWire(mockParams)

    expect(client1).toBe(client2)

    expect(WSClient).toHaveBeenCalledTimes(1)
    expect(HTTPClient).toHaveBeenCalledTimes(1)
    expect(Conversation).toHaveBeenCalledTimes(1)
    expect(mockConnect).toHaveBeenCalledTimes(1)

    await client1.disconnect()
  })

  it('should reset the instance after calling disconnect', async () => {
    const client = await SignalWire(mockParams)

    await client.disconnect()
    expect(mockDisconnect).toHaveBeenCalledTimes(1)
    const newClient = await SignalWire(mockParams)

    expect(newClient).not.toBe(client)

    expect(WSClient).toHaveBeenCalledTimes(2)
    expect(HTTPClient).toHaveBeenCalledTimes(2)
    expect(Conversation).toHaveBeenCalledTimes(2)
    expect(mockConnect).toHaveBeenCalledTimes(2)

    await client.disconnect()
  })

  it('should handle errors during initialization and allow retry', async () => {
    mockConnect.mockImplementationOnce(() => {
      throw new Error('Connection failed')
    })

    await expect(SignalWire(mockParams)).rejects.toThrow('Connection failed')

    expect(WSClient).toHaveBeenCalledTimes(1)
    expect(HTTPClient).toHaveBeenCalledTimes(1)
    expect(Conversation).toHaveBeenCalledTimes(1)
    expect(mockConnect).toHaveBeenCalledTimes(1)

    const client = await SignalWire(mockParams)
    expect(client).toBeDefined()
    expect(WSClient).toHaveBeenCalledTimes(2)
    expect(HTTPClient).toHaveBeenCalledTimes(2)
    expect(Conversation).toHaveBeenCalledTimes(2)
    expect(mockConnect).toHaveBeenCalledTimes(2)

    await client.disconnect()
  })
})
