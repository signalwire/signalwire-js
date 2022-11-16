import { test, expect, WebSocket } from '@playwright/test'
import { SERVER_URL, createTestCRTToken, enablePageLogs } from '../utils'

test.describe('PubSub', () => {
  test('should subscribe to a PubSub channel and publish a message', async ({
    page,
  }) => {
    await page.goto(SERVER_URL)
    enablePageLogs(page)

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
            const PubSub = window._SWJS.PubSub
            const pubSubClient = new PubSub.Client({
              host: options.RELAY_HOST,
              token: options.API_TOKEN,
            })
            const allowedChannels = await pubSubClient.getAllowedChannels()
            // .subscribe should be after .on but i left here for test.
            await pubSubClient.subscribe([options.channel])
            pubSubClient.on('message', (message: any) => {
              resolve({ allowedChannels, message })
            })

            await pubSubClient.publish({
              channel: options.channel,
              content: options.messageContent,
            })
          } catch (error) {
            console.log('PubSub Error', error)
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
    await page.goto(SERVER_URL)
    enablePageLogs(page)

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
        const PubSub = window._SWJS.PubSub
        const pubSubClient = new PubSub.Client({
          host: options.RELAY_HOST,
          token: options.API_TOKEN,
        })

        // @ts-expect-error
        window.__pubSubClient = pubSubClient

        return pubSubClient.subscribe([options.channel])
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
      window.__pubSubClient.disconnect()
    })

    await closePromise
  })
})
