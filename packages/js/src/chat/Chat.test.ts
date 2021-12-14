import WS from 'jest-websocket-mock'
import { Chat } from './Chat'

describe('Chat Object', () => {
  const host = 'ws://localhost:1234'
  const token = '<jwt>'

  let server: WS
  beforeEach(async () => {
    server = new WS(host)
    server.on('connection', (socket) => {
      socket.on('message', (data: any) => {
        const parsedData = JSON.parse(data)

        socket.send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: parsedData.id,
            result: {},
          })
        )
      })
    })
  })

  afterEach(() => {
    WS.clean()
  })

  it('should automatically connect when calling either .subscribe() or .publish()', async () => {
    const chat = new Chat({
      host,
      token,
    })

    chat.on('message', () => {})
    await chat.subscribe(['test'])
    await chat.publish({
      channel: 'test',
      message: 'test',
    })

    const connectMsg = JSON.parse(server.messages[0].toString())
    expect(connectMsg.method).toBe('signalwire.connect')
    expect(server.messages.length).toBe(3)
  })

  it('should emit a single "signalwire.connect" at most when subscribing/publishing at the same time', async () => {
    const chat = new Chat({
      host,
      token,
    })

    chat.on('message', () => {})
    await Promise.all([
      chat.subscribe(['test']),
      chat.publish({
        channel: 'test',
        message: 'test',
      }),
    ])

    const connectMsg = JSON.parse(server.messages[0].toString())
    expect(connectMsg.method).toBe('signalwire.connect')
    expect(
      server.messages.filter((message) => {
        const parsedMessage = JSON.parse(message.toString())

        return parsedMessage.method === 'signalwire.connect'
      }).length
    ).toBe(1)
  })

  describe('Subscribe', () => {
    it('should convert channels into the internal channel notation when calling .subscribe()', async () => {
      const chat = new Chat({
        host,
        token,
      })

      chat.on('message', () => {})
      await chat.subscribe(['test1', 'test2', 'test3'])

      const subscribeMsg = JSON.parse(server.messages[1].toString())
      expect(subscribeMsg.params.channels).toStrictEqual([
        { name: 'test1' },
        { name: 'test2' },
        { name: 'test3' },
      ])
    })
  })

  describe('Publish', () => {
    it('should support publishing-only mode', async () => {
      const chat = new Chat({
        host,
        token,
      })

      const params = {
        channel: 'test',
        message: 'test',
      }

      await chat.publish(params)

      server.messages.forEach((message, i) => {
        const parsedMessage = JSON.parse(message.toString())

        if (i === 0) {
          expect(parsedMessage.method).toBe('signalwire.connect')
        } else {
          expect(parsedMessage.method).toBe('chat.publish')
          expect(parsedMessage.params).toStrictEqual(params)
        }
      })
    })
  })

  describe('Unsubscribe', () => {
    it('should convert channels into the internal channel notation when calling .unsubscribe()', async () => {
      const chat = new Chat({
        host,
        token,
      })

      chat.on('message', () => {})
      await chat.subscribe(['test1', 'test2', 'test3'])
      await chat.unsubscribe(['test1', 'test2', 'test3'])

      const unsubscribeMsg = JSON.parse(server.messages[1].toString())
      expect(unsubscribeMsg.params.channels).toStrictEqual([
        { name: 'test1' },
        { name: 'test2' },
        { name: 'test3' },
      ])
    })

    it('should allow the user to .unsubscribe() from any subgroup of subscribed channels', async () => {
      expect.assertions(4)
      const chat = new Chat({
        host,
        token,
      })

      chat.on('message', () => {})

      await chat.subscribe(['test1', 'test2', 'test3'])
      expect(await chat.unsubscribe(['test1', 'test3'])).toBeUndefined()
      expect(await chat.unsubscribe(['test1', 'test2'])).toBeUndefined()
      expect(await chat.unsubscribe(['test2', 'test3'])).toBeUndefined()
      expect(
        await chat.unsubscribe(['test1', 'test2', 'test3'])
      ).toBeUndefined()
    })

    it('should throw if the user calls .unsubscribe() before the session is authorized', async () => {
      expect.assertions(1)
      const chat = new Chat({
        host,
        token,
      })

      chat.on('message', () => {})

      try {
        await chat.unsubscribe(['test1'])
      } catch (err) {
        expect(err.message).toBe(
          'You must be authenticated to unsubscribe from a channel'
        )
      }
    })

    it('should throw if the user calls .unsubscribe() without being subscribed to channels', async () => {
      expect.assertions(1)
      const chat = new Chat({
        host,
        token,
      })

      chat.on('message', () => {})

      // This is to force the session to be connected when
      // calling unsubscribe()
      await chat.publish({
        channel: 'test',
        message: 'test',
      })

      try {
        await chat.unsubscribe(['test1'])
      } catch (err) {
        expect(err.message).toBe(
          'You must subscribe to at least one channel before calling unsubscribe()'
        )
      }
    })

    it('should throw if the user calls .unsubscribe() with channels different than the ones they are subscribed to', async () => {
      expect.assertions(1)
      const chat = new Chat({
        host,
        token,
      })

      chat.on('message', () => {})

      try {
        await chat.subscribe(['test1', 'test2', 'test3', 'test4'])
        await chat.unsubscribe(['test1', 'test5'])
      } catch (err) {
        expect(err.message).toBe(
          `You can't unsubscribe from a channel that you didn't subscribe to. You're subscribed to the following channels: test1, test2, test3, test4 but tried to unsubscribe from: test1, test5`
        )
      }
    })
  })
})
