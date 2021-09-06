import {
  checkWebSocketHost,
  timeoutPromise,
  validateEventsToSubscribe,
} from './'

describe('checkWebSocketHost', () => {
  it('should add wss protocol if not present', () => {
    expect(checkWebSocketHost('example.com')).toEqual('wss://example.com')
    expect(checkWebSocketHost('test.example.com:8082')).toEqual(
      'wss://test.example.com:8082'
    )
  })

  it('should do nothing if protocol is already present', () => {
    expect(checkWebSocketHost('ws://example.com')).toEqual('ws://example.com')
    expect(checkWebSocketHost('ws://example.com:8082')).toEqual(
      'ws://example.com:8082'
    )
    expect(checkWebSocketHost('wss://test.example.com')).toEqual(
      'wss://test.example.com'
    )
    expect(checkWebSocketHost('wss://test.example.com:8082')).toEqual(
      'wss://test.example.com:8082'
    )
  })
})

describe('timeoutPromise', () => {
  it('should resolve successfully without timeout', async () => {
    const promise = Promise.resolve('value')
    const error = 'ERROR'
    const result = await timeoutPromise(promise, 5, error)
    expect(result).toBe('value')
  })

  it('should reject in case of timeout', async () => {
    const promise = new Promise(() => null)
    const error = 'ERROR'
    await expect(timeoutPromise(promise, 5, error)).rejects.toEqual(error)
  })
})

describe('validateEventsToSubscribe', () => {
  it('should be no-op for valid event list', () => {
    const events = [
      'member.joined',
      'random.event.camelCase',
      'random.event.snake_case',
      'layout.changed',
      'member.updated',
      'member.left',
    ]
    expect(validateEventsToSubscribe(events)).toStrictEqual(events)
  })

  it('should check for custom-events', () => {
    const events = [
      'member.joined',
      'member.updated.videoMuted',
      'member.updated.visible',
    ]
    expect(validateEventsToSubscribe(events)).toStrictEqual([
      'member.joined',
      'member.updated',
    ])
  })

  it('should check for custom-events and make it unique', () => {
    const events = [
      'member.joined',
      'member.updated',
      'member.updated.videoMuted',
      'member.updated.visible',
    ]
    expect(validateEventsToSubscribe(events)).toStrictEqual([
      'member.joined',
      'member.updated',
    ])
  })
})
