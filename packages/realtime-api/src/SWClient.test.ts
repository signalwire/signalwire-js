import { SWClient } from './SWClient'
import { createClient } from './client/createClient'
import { clientConnect } from './client/clientConnect'
import { Task } from './task/Task'
import { Messaging } from './messaging/Messaging'
import { PubSub } from './pubSub/PubSub'
import { Chat } from './chat/Chat'
import { Voice } from './voice/Voice'
import { Video } from './video/Video'

jest.mock('./client/createClient')
jest.mock('./client/clientConnect')

describe('SWClient', () => {
  let swClient: SWClient
  let clientMock: any
  const userOptions = {
    host: 'example.com',
    project: 'example.project',
    token: 'example.token',
  }

  beforeEach(() => {
    clientMock = {
      disconnect: jest.fn(),
      runWorker: jest.fn(),
      sessionEmitter: {
        on: jest.fn(),
        off: jest.fn(),
      },
      session: {
        on: jest.fn(),
        once: jest.fn(),
        off: jest.fn(),
      },
    }
    ;(createClient as any).mockReturnValue(clientMock)

    swClient = new SWClient(userOptions)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should create SWClient instance with the provided options', () => {
    expect(swClient.userOptions).toEqual(userOptions)
    expect(createClient).toHaveBeenCalledWith(userOptions)
  })

  it('should connect the client', async () => {
    await swClient.connect()
    expect(clientConnect).toHaveBeenCalledWith(clientMock)
  })

  it('should disconnect the client and resolve when session.disconnected is emitted', async () => {
    let disconnectCallback: () => void
    clientMock.sessionEmitter.on.mockImplementation(
      (event: string, callback: () => void) => {
        if (event === 'session.disconnected') {
          disconnectCallback = callback
        }
      }
    )

    const disconnectPromise = swClient.disconnect()

    expect(clientMock.sessionEmitter.on).toHaveBeenCalledWith(
      'session.disconnected',
      expect.any(Function)
    )
    expect(clientMock.disconnect).toHaveBeenCalled()

    // Simulate the disconnect event
    disconnectCallback!()

    await expect(disconnectPromise).resolves.toBeUndefined()
  })

  it('should create and return a Task instance', () => {
    const task = swClient.task
    expect(task).toBeInstanceOf(Task)
    expect(swClient.task).toBe(task)
  })

  it('should create and return a Messaging instance', () => {
    const messaging = swClient.messaging
    expect(messaging).toBeInstanceOf(Messaging)
    expect(swClient.messaging).toBe(messaging)
  })

  it('should create and return a PubSub instance', () => {
    const pubSub = swClient.pubSub
    expect(pubSub).toBeInstanceOf(PubSub)
    expect(swClient.pubSub).toBe(pubSub)
  })

  it('should create and return a Chat instance', () => {
    const chat = swClient.chat
    expect(chat).toBeInstanceOf(Chat)
    expect(swClient.chat).toBe(chat)
  })

  it('should create and return a Voice instance', () => {
    const voice = swClient.voice
    expect(voice).toBeInstanceOf(Voice)
    expect(swClient.voice).toBe(voice)
  })

  it('should create and return a Video instance', () => {
    const video = swClient.video
    expect(video).toBeInstanceOf(Video)
    expect(swClient.video).toBe(video)
  })

  describe('session listeners', () => {
    it('should attach session listeners provided in constructor options', () => {
      const onConnected = jest.fn()
      const onDisconnected = jest.fn()
      const onReconnecting = jest.fn()
      const onAuthError = jest.fn()
      const onAuthExpiring = jest.fn()

      new SWClient({
        ...userOptions,
        listen: {
          onConnected,
          onDisconnected,
          onReconnecting,
          onAuthError,
          onAuthExpiring,
        },
      })

      expect(clientMock.sessionEmitter.on).toHaveBeenCalledWith(
        'session.connected',
        onConnected
      )
      expect(clientMock.sessionEmitter.on).toHaveBeenCalledWith(
        'session.disconnected',
        onDisconnected
      )
      expect(clientMock.sessionEmitter.on).toHaveBeenCalledWith(
        'session.reconnecting',
        onReconnecting
      )
      expect(clientMock.sessionEmitter.on).toHaveBeenCalledWith(
        'session.auth_error',
        onAuthError
      )
      expect(clientMock.sessionEmitter.on).toHaveBeenCalledWith(
        'session.expiring',
        onAuthExpiring
      )
    })

    it('should not attach listeners when listen option is not provided', () => {
      new SWClient(userOptions)
      expect(clientMock.sessionEmitter.on).not.toHaveBeenCalled()
    })

    it('should only attach listeners that are functions', () => {
      new SWClient({
        ...userOptions,
        listen: {
          onConnected: jest.fn(),
          onDisconnected: undefined,
        },
      })

      expect(clientMock.sessionEmitter.on).toHaveBeenCalledTimes(1)
      expect(clientMock.sessionEmitter.on).toHaveBeenCalledWith(
        'session.connected',
        expect.any(Function)
      )
    })

    it('should attach listeners via listen() method and return unsubscribe function', () => {
      const onConnected = jest.fn()
      const onDisconnected = jest.fn()

      const unsubscribe = swClient.listen({
        onConnected,
        onDisconnected,
      })

      expect(clientMock.sessionEmitter.on).toHaveBeenCalledWith(
        'session.connected',
        onConnected
      )
      expect(clientMock.sessionEmitter.on).toHaveBeenCalledWith(
        'session.disconnected',
        onDisconnected
      )

      // Call unsubscribe
      unsubscribe()

      expect(clientMock.sessionEmitter.off).toHaveBeenCalledWith(
        'session.connected',
        onConnected
      )
      expect(clientMock.sessionEmitter.off).toHaveBeenCalledWith(
        'session.disconnected',
        onDisconnected
      )
    })

    it('should handle partial listeners in listen() method', () => {
      const onReconnecting = jest.fn()

      swClient.listen({
        onReconnecting,
      })

      expect(clientMock.sessionEmitter.on).toHaveBeenCalledTimes(1)
      expect(clientMock.sessionEmitter.on).toHaveBeenCalledWith(
        'session.reconnecting',
        onReconnecting
      )
    })
  })
})
