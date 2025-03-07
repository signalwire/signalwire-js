import { SWClient } from './SWClient'
import { createClient } from './client/createClient'
import { clientConnect } from './client/clientConnect'
import { Task } from './task/Task'
import { PubSub } from './pubSub/PubSub'
import { Chat } from './chat/Chat'

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
      sessionEmitter: { on: jest.fn() },
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

  it('should disconnect the client', () => {
    swClient.disconnect()
    expect(clientMock.disconnect).toHaveBeenCalled()
  })

  it('should create and return a Task instance', () => {
    const task = swClient.task
    expect(task).toBeInstanceOf(Task)
    expect(swClient.task).toBe(task) // Ensure the same instance is returned on subsequent calls
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
})
