import { Video } from '@signalwire/js'
import { test, expect } from '../fixtures'
import { SERVER_URL, createTestSATToken } from '../utils'

test.describe('CallFabric', () => {
  test('should join a video room', async ({ createCustomPage }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const sat = await createTestSATToken()
    if (!sat) {
      console.error('Invalid SAT. Exiting..')
      process.exit(4)
    }

    // Create client
    await page.evaluate(
      async (options) => {
        // @ts-expect-error
        const SignalWire = window._SWJS.SignalWire
        const client = await SignalWire({
          host: options.RELAY_HOST,
          token: options.API_TOKEN,
          rootElement: document.getElementById('rootElement'),
          debug: { logWsTraffic: true },
        })

        // @ts-expect-error
        window._client = client

        return client
      },
      {
        RELAY_HOST: process.env.RELAY_HOST,
        API_TOKEN: sat,
      }
    )

    // Dial an address and join a video room
    const roomSession = await page.evaluate(async () => {
      // @ts-expect-error
      const client = window._client

      const call = await client.dial({
        to: '/public/cf-e2e-test-room',
        logLevel: 'debug',
        debug: { logWsTraffic: true },
        nodeId: undefined,
      })

      // @ts-expect-error
      window._roomObj = call

      await call.start()

      return call
    })

    expect(roomSession).toBeDefined()
    expect(roomSession).toBeDefined()
    expect(roomSession.state).toBe('active')

    // Checks that the video is visible
    await page.waitForSelector('div[id="rootElement"] video')

    // Hangup the call
    const hangupRoom = await page.evaluate(() => {
      return new Promise((resolve, _reject) => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj

        roomObj.on('destroy', resolve)

        // @ts-expect-error
        roomObj.hangup()
      })
    })

    // @ts-expect-error
    expect(hangupRoom.state).toBe('destroy')
  })
})
