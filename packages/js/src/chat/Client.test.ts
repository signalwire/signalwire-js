import WS from 'jest-websocket-mock'
import { Client } from './Client'

describe('ChatClient Object', () => {
  const host = 'ws://localhost:1234'
  const token = '<jwt>'
  const messages = [
    {
      id: '5fdc8fc5-b7fe-4fbd-8204-f2310dec2614',
      sender_id: '1507e5f9-075c-463d-94ba-a8f9ec0c7d4e',
      content: 'hello world',
      published_at: 1641393396.153,
    },
  ]

  let server: WS
  beforeEach(async () => {
    server = new WS(host)
    server.on('connection', (socket) => {
      socket.on('message', (data: any) => {
        const parsedData = JSON.parse(data)

        // The error message is not important for the test.
        // The idea is just to document what's the expected
        // behavior (reject) or not (resolve).
        if (
          parsedData.method === 'chat.unsubscribe' &&
          (parsedData.params.channels.length === 0 ||
            parsedData.params.channels.some((ch: any) =>
              ch.name.endsWith('_error')
            ))
        ) {
          socket.send(
            JSON.stringify({
              jsonrpc: '2.0',
              id: parsedData.id,
              error: { code: -32600, message: 'Invalid Request' },
            })
          )
        } else if (parsedData.method === 'chat.messages.get') {
          socket.send(
            JSON.stringify({
              jsonrpc: '2.0',
              id: parsedData.id,
              result: {
                code: '200',
                message: 'OK',
                messages,
                cursor: {
                  before: 'before',
                  after: 'after',
                },
              },
            })
          )
        } else if (parsedData.method === 'chat.members.get') {
          socket.send(
            JSON.stringify({
              jsonrpc: '2.0',
              id: parsedData.id,
              result: {
                code: '200',
                message: 'Success',
                members: [
                  {
                    id: '1507e5f9-075c-463d-94ba-a8f9ec0c7d4e',
                  },
                ],
              },
            })
          )
        } else if (parsedData.method === 'chat.member.set_state') {
          socket.send(
            JSON.stringify({
              jsonrpc: '2.0',
              id: parsedData.id,
              result: {
                code: '200',
                message: 'Success',
              },
            })
          )
        } else if (parsedData.method === 'chat.member.get_state') {
          socket.send(
            JSON.stringify({
              jsonrpc: '2.0',
              id: parsedData.id,
              result: {
                code: '200',
                message: 'Success',
                channels: {
                  lobby: {
                    state: {
                      typing: true,
                    },
                  },
                },
                member: {
                  id: '1507e5f9-075c-463d-94ba-a8f9ec0c7d4e',
                },
              },
            })
          )
        } else {
          socket.send(
            JSON.stringify({
              jsonrpc: '2.0',
              id: parsedData.id,
              result: {},
            })
          )
        }
      })
    })
  })

  afterEach(() => {
    WS.clean()
  })

  it('should automatically connect when calling either .subscribe() or .publish()', async () => {
    const chat = new Client({
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
    const chat = new Client({
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

  describe('message handler', () => {
    it('should return a ChatMessage object', (done) => {
      WS.clean()
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

          if (parsedData.method === 'chat.subscribe') {
            socket.send(
              JSON.stringify({
                jsonrpc: '2.0',
                id: '7a5cbfac-d1f8-4e7f-b1cf-9e1f7cdc6b54',
                method: 'signalwire.event',
                params: {
                  event_type: 'chat.channel.message',
                  event_channel: 'chat',
                  params: {
                    channel: 'lobby',
                    message: {
                      id: 'f5511ad5-4dc2-4d28-a449-cc39909093b9',
                      sender_id: '1507e5f9-075c-463d-94ba-a8f9ec0c7d4e',
                      content: 'Hello World!',
                      published_at: 1641405257.795,
                    },
                  },
                  timestamp: 1641405258.253,
                },
              })
            )
          }
        })
      })

      const chat = new Client({
        host,
        token,
      })
      chat.on('message', (message) => {
        expect(message.channel).toBe('lobby')
        expect(message.id).toBe('f5511ad5-4dc2-4d28-a449-cc39909093b9')
        expect(message.senderId).toBe('1507e5f9-075c-463d-94ba-a8f9ec0c7d4e')
        expect(message.content).toBe('Hello World!')
        expect(message.publishedAt).toStrictEqual(
          new Date(1641405257.795 * 1000)
        )

        done()
      })
      chat.subscribe(['test1'])
    })
  })

  describe('member event handlers', () => {
    const _setupMockWS = (eventPayload: any) => {
      WS.clean()
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

          if (parsedData.method === 'chat.subscribe') {
            socket.send(JSON.stringify(eventPayload))
          }
        })
      })
    }

    it('should return a ChatMember object on member.joined', (done) => {
      _setupMockWS({
        jsonrpc: '2.0',
        id: '45266133-cdfe-4e99-a257-1ea77572f1d9',
        method: 'signalwire.event',
        params: {
          event_type: 'chat.member.joined',
          event_channel: 'chat',
          params: {
            channel: 'lobby',
            member: {
              id: '1507e5f9-075c-463d-94ba-a8f9ec0c7d4e',
            },
          },
          timestamp: 1641468229.28,
        },
      })

      const chat = new Client({
        host,
        token,
      })
      chat.on('member.joined', (member) => {
        expect(member.channel).toBe('lobby')
        expect(member.id).toBe('1507e5f9-075c-463d-94ba-a8f9ec0c7d4e')

        done()
      })

      chat.subscribe(['test1'])
    })

    it('should return a ChatMember object on member.updated', (done) => {
      _setupMockWS({
        jsonrpc: '2.0',
        id: 'f734e59a-dea2-4de2-8369-7f6df4bf3016',
        method: 'signalwire.event',
        params: {
          event_type: 'chat.member.updated',
          event_channel: 'chat',
          params: {
            channel: 'lobby',
            member: {
              id: '1507e5f9-075c-463d-94ba-a8f9ec0c7d4e',
            },
            state: {
              typing: true,
            },
          },
          timestamp: 1641468242.538,
        },
      })

      const chat = new Client({
        host,
        token,
      })
      chat.on('member.updated', (member) => {
        expect(member.channel).toBe('lobby')
        expect(member.id).toBe('1507e5f9-075c-463d-94ba-a8f9ec0c7d4e')
        expect(member.state).toStrictEqual({
          typing: true,
        })

        done()
      })

      chat.subscribe(['test1'])
    })

    it('should return a ChatMember object on member.left', (done) => {
      _setupMockWS({
        jsonrpc: '2.0',
        id: '45266133-cdfe-4e99-a257-1ea77572f1d9',
        method: 'signalwire.event',
        params: {
          event_type: 'chat.member.left',
          event_channel: 'chat',
          params: {
            channel: 'lobby',
            member: {
              id: '1507e5f9-075c-463d-94ba-a8f9ec0c7d4e',
            },
          },
          timestamp: 1641468229.28,
        },
      })

      const chat = new Client({
        host,
        token,
      })
      chat.on('member.left', (member) => {
        expect(member.channel).toBe('lobby')
        expect(member.id).toBe('1507e5f9-075c-463d-94ba-a8f9ec0c7d4e')

        done()
      })

      chat.subscribe(['test1'])
    })
  })

  describe('Subscribe', () => {
    it('should convert channels into the internal channel notation when calling .subscribe()', async () => {
      const chat = new Client({
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
      const chat = new Client({
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
    it('should convert channels into the internal channel notation', async () => {
      const chat = new Client({
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
      const chat = new Client({
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

    it('should reject if its called before the session is authorized', async () => {
      expect.assertions(1)
      const chat = new Client({
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

    it("should reject if it's called without channels", async () => {
      expect.assertions(1)
      const chat = new Client({
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

      await expect(() => chat.unsubscribe(['test1_error'])).rejects.toBeTruthy()
    })

    it('should reject if the user calls .unsubscribe() with channels different than the ones they are subscribed to', async () => {
      expect.assertions(1)
      const chat = new Client({
        host,
        token,
      })

      chat.on('message', () => {})

      await chat.subscribe(['test1', 'test2', 'test3', 'test4'])
      await expect(() =>
        chat.unsubscribe(['test1', 'test5_error'])
      ).rejects.toBeTruthy()
    })
  })

  describe('getMembers', () => {
    it('should send the proper RPC and format the response', async () => {
      const chat = new Client({
        host,
        token,
      })
      chat.on('message', () => {})
      await chat.subscribe(['test1'])

      const response = await chat.getMembers({ channel: 'test1' })

      const request = JSON.parse(server.messages[2].toString())
      expect(request.method).toEqual('chat.members.get')
      expect(request.params).toStrictEqual({ channel: 'test1' })

      expect(response).toStrictEqual({
        members: [
          {
            id: '1507e5f9-075c-463d-94ba-a8f9ec0c7d4e',
          },
        ],
      })
    })
  })

  describe('getMessages', () => {
    it('should send the proper RPC and format the response', async () => {
      const chat = new Client({
        host,
        token,
      })
      chat.on('message', () => {})
      await chat.subscribe(['test1'])

      const response = await chat.getMessages({
        channel: 'test1',
        cursor: { before: 'before' },
      })

      const request = JSON.parse(server.messages[2].toString())
      expect(request.method).toEqual('chat.messages.get')
      expect(request.params).toStrictEqual({
        channel: 'test1',
        cursor: { before: 'before' },
      })

      expect(response).toStrictEqual({
        messages: [
          {
            id: '5fdc8fc5-b7fe-4fbd-8204-f2310dec2614',
            senderId: '1507e5f9-075c-463d-94ba-a8f9ec0c7d4e',
            content: 'hello world',
            publishedAt: new Date(1641393396.153 * 1000),
          },
        ],
        cursor: {
          before: 'before',
          after: 'after',
        },
      })
    })
  })

  describe('setState', () => {
    it('should send the proper RPC and format the response', async () => {
      const chat = new Client({
        host,
        token,
      })
      chat.on('message', () => {})
      await chat.subscribe(['test1'])

      const response = await chat.setMemberState({
        channels: 'test1',
        state: { typing: true },
      })

      const request = JSON.parse(server.messages[2].toString())
      expect(request.method).toEqual('chat.member.set_state')
      expect(request.params).toStrictEqual({
        channels: [{ name: 'test1' }],
        state: { typing: true },
      })

      expect(response).toStrictEqual(undefined)
    })
  })

  describe('getState', () => {
    it('should send the proper RPC and format the response', async () => {
      const chat = new Client({
        host,
        token,
      })
      chat.on('message', () => {})
      await chat.subscribe(['test1'])

      const response = await chat.getMemberState({
        memberId: 'memberId',
        channels: 'test1',
      })

      const request = JSON.parse(server.messages[2].toString())
      expect(request.method).toEqual('chat.member.get_state')
      expect(request.params).toStrictEqual({
        channels: [{ name: 'test1' }],
        member_id: 'memberId',
      })

      expect(response).toStrictEqual({
        channels: {
          lobby: {
            state: {
              typing: true,
            },
          },
        },
      })
    })

    it('should send the proper RPC without (optional) channels', async () => {
      const chat = new Client({
        host,
        token,
      })
      chat.on('message', () => {})
      await chat.subscribe(['test1'])

      const response = await chat.getMemberState({
        memberId: 'memberId',
      })

      const request = JSON.parse(server.messages[2].toString())
      expect(request.method).toEqual('chat.member.get_state')
      expect(request.params).toStrictEqual({
        member_id: 'memberId',
      })

      expect(response).toStrictEqual({
        channels: {
          lobby: {
            state: {
              typing: true,
            },
          },
        },
      })
    })
  })
})
