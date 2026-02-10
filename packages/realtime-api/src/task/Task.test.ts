import { request } from 'node:https'
import { EventEmitter } from '@signalwire/core'
import { Task, PATH } from './Task'
import { createClient } from '../client/createClient'

jest.mock('node:https', () => {
  return {
    request: jest.fn().mockImplementation((_, callback) => {
      callback({ statusCode: 204 })
    }),
  }
})

describe('Task', () => {
  let task: Task
  const userOptions = {
    host: 'example.com',
    project: 'example.project',
    token: 'example.token',
  }
  const swClientMock = {
    userOptions,
    client: createClient(userOptions),
  }
  const topic = 'jest-topic'
  const message = { data: 'Hello from jest!' }

  beforeEach(() => {
    // @ts-expect-error
    task = new Task(swClientMock)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should have an event emitter', () => {
    expect(task['emitter']).toBeInstanceOf(EventEmitter)
  })

  it('should declare the correct event map', () => {
    const expectedEventMap = {
      onTaskReceived: 'task.received',
    }
    expect(task['_eventMap']).toEqual(expectedEventMap)
  })

  it('should throw an error when sending a task with invalid options', async () => {
    // Create a new instance of Task with invalid options
    const invalidTask = new Task({
      // @ts-expect-error
      userOptions: {},
      client: createClient(userOptions),
    })

    await expect(async () => {
      await invalidTask.send({ topic, message })
    }).rejects.toThrowError('Invalid options: project and token are required!')
  })

  it('should send a task', async () => {
    await task.send({ topic, message })

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        path: PATH,
        host: userOptions.host,
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Content-Length': expect.any(Number),
          Authorization: expect.stringContaining('Basic'),
        }),
      }),
      expect.any(Function)
    )
  })
})
