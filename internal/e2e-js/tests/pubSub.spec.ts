import { test, expect } from '@playwright/test'
import { createTestServer, createTestCRTToken } from '../utils'

test.describe('PubSub', () => {
  let server: any = null

  test.beforeAll(async () => {
    server = await createTestServer()
    await server.start()
  })

  test.afterAll(async () => {
    await server.close()
  })

  test('should subscribe to a PubSub channel and publish a message', async ({
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
})
