import { test, expect } from '@playwright/test'
import { createTestServer, createTestCRTToken } from '../utils'

test.describe('RoomSession', () => {
  let server: any = null

  test.beforeAll(async () => {
    server = await createTestServer()
    await server.start()
  })

  test.afterAll(async () => {
    await server.close()
  })

  test('should handle joining a room, perform actions and then leave the room', async ({
    page,
  }) => {
    await page.goto(server.url)

    page.on('console', (log) => {
      console.log(log)
    })

    const channel = 'js-e2e'
    const messageContent = Date.now()

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
    const chatMessage: any = await page.evaluate(
      (options) => {
        return new Promise(async (resolve) => {
          // @ts-expect-error
          const PubSub = window._SWJS.PubSub

          const pubSubClient = new PubSub.Client({
            host: options.RELAY_HOST,
            token: options.API_TOKEN,
          })
          // .subscribe should be after .on but i left here for test.
          await pubSubClient.subscribe([options.channel, 'another'])

          pubSubClient.on('message', (message: any) => {
            resolve(message)
          })

          await pubSubClient.publish({
            channel: options.channel,
            content: messageContent,
          })
        })
      },
      {
        RELAY_HOST: process.env.RELAY_HOST,
        API_TOKEN: crt,
        channel,
        messageContent,
      }
    )

    expect(chatMessage.content).toBe(messageContent)
    expect(chatMessage.channel).toBe(channel)
  })
})
