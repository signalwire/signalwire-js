import { Voice } from '@signalwire/realtime-api'
import { createCFClient, expectPageReceiveAudio } from '../../utils'
import { test } from '../../fixtures'
import { SERVER_URL } from '../../utils'

test.describe('CallFabric Relay Application', () => {
  test('should connect to the relay app and expect an audio playback', async ({
    createCustomPage,
  }) => {
    const client = new Voice.Client({
      host: process.env.RELAY_HOST,
      project: process.env.RELAY_PROJECT as string,
      token: process.env.RELAY_TOKEN as string,
      topics: ['office'],
      debug: {
        logWsTraffic: true,
      },
    })

    client.on('call.received', async (call) => {
      try {
        console.log('Call received', call.id)

        await call.answer()
        console.log('Inbound call answered')

        const playback = await call.playAudio({
          url: 'https://cdn.signalwire.com/default-music/welcome.mp3',
        })
        await playback.setVolume(10)
      } catch (error) {
        console.error('Inbound call error', error)
      }
    })

    try {
      const page = await createCustomPage({ name: '[page]' })
      await page.goto(SERVER_URL)

      await createCFClient(page)

      const resourceName = 'cf-e2e-test-connect-phone'

      await page.evaluate(
        async (options) => {
          // @ts-expect-error
          const client = window._client

          const call = await client.dial({
            to: `/public/${options.resourceName}`,
            nodeId: undefined,
          })

          // @ts-expect-error
          window._roomObj = call

          await call.start()
        },
        {
          resourceName,
        }
      )

      await expectPageReceiveAudio(page)

      // Hangup the call
      await page.evaluate(async () => {
        // @ts-expect-error
        const call = window._roomObj

        await call.hangup()
      })

      client.disconnect()
    } catch (error) {
      console.error('CreateRoomSession Error', error)
    }
  })
})
