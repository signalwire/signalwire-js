import { test, expect, WebSocket } from '@playwright/test'
import { createTestServer, createTestCRTToken } from '../utils'

test.describe('Chat', () => {
  let server: any = null

  test.beforeAll(async () => {
    server = await createTestServer()
    await server.start()
  })

  test.afterAll(async () => {
    await server.close()
  })

  test('should subscribe to a Chat channel and publish a message', async ({
    page,
  }) => {
    await page.goto(server.url)

    page.on('console', (log) => {
      console.log(log)
    })

    const channel = 'js-e2e'
    const messageContent = Date.now().toString()

    const crt = await createTestCRTToken({
      ttl: 30,
      member_id: 'chat-e2e',
      state: {},
      channels: {
        [channel]: {
          read: true,
          write: true,
        },
      },
    })

    const { message: chatMessage, allowedChannels }: any = await page.evaluate(
      (options) => {
        return new Promise(async (resolve) => {
          try {
            // @ts-expect-error
            const Chat = window._SWJS.Chat
            const client = new Chat.Client({
              host: options.RELAY_HOST,
              token: options.API_TOKEN,
            })
            const allowedChannels = await client.getAllowedChannels()
            // .subscribe should be after .on but i left here for test.
            await client.subscribe([options.channel])
            client.on('message', (message: any) => {
              resolve({ allowedChannels, message })
            })

            await client.publish({
              channel: options.channel,
              content: options.messageContent,
            })
          } catch (error) {
            console.log('Chat Error', error)
          }
        })
      },
      {
        RELAY_HOST: process.env.RELAY_HOST,
        API_TOKEN: crt,
        channel,
        messageContent,
      }
    )
    expect(allowedChannels).toStrictEqual({
      'js-e2e': { read: true, write: true },
    })
    expect(chatMessage.content).toBe(messageContent)
    expect(chatMessage.channel).toBe(channel)
  })

  test('should expose disconnect()', async ({ page }) => {
    await page.goto(server.url)

    page.on('console', (log) => {
      console.log(log)
    })

    const webSocketPromise = new Promise<WebSocket>((resolve) => {
      page.on('websocket', (ws) => resolve(ws))
    })

    const channel = 'js-e2e'

    const crt = await createTestCRTToken({
      ttl: 30,
      member_id: 'chat-e2e',
      state: {},
      channels: {
        [channel]: {
          read: true,
          write: true,
        },
      },
    })

    await page.evaluate(
      (options) => {
        // @ts-expect-error
        const Chat = window._SWJS.Chat
        const client = new Chat.Client({
          host: options.RELAY_HOST,
          token: options.API_TOKEN,
        })

        // @ts-expect-error
        window.__client = client

        return client.subscribe([options.channel])
      },
      {
        RELAY_HOST: process.env.RELAY_HOST,
        API_TOKEN: crt,
        channel,
      }
    )

    const ws = await webSocketPromise
    const closePromise = new Promise((resolve) => {
      ws.on('close', () => {
        resolve(0)
      })
    })

    await page.evaluate(() => {
      // @ts-expect-error
      window.__client.disconnect()
    })

    await closePromise
  })
})
