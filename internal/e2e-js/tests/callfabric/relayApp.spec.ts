import { SignalWire } from '@signalwire/realtime-api'
import {
  createCFClient,
  // expectPageReceiveAudio,
  getAudioStats,
  SERVER_URL,
} from '../../utils'
import { test, expect } from '../../fixtures'

test.describe('CallFabric Relay Application', () => {
  // test('should connect to the relay app and expect an audio playback', async ({
  //   createCustomPage,
  // }) => {
  //   const client = await SignalWire({
  //     host: process.env.RELAY_HOST,
  //     project: process.env.RELAY_PROJECT as string,
  //     token: process.env.RELAY_TOKEN as string,
  //     debug: {
  //       logWsTraffic: true,
  //     },
  //   })

  //   await client.voice.listen({
  //     topics: ['cf-e2e-test-relay'],
  //     onCallReceived: async (call) => {
  //       try {
  //         console.log('Call received', call.id)

  //         await call.answer()
  //         console.log('Inbound call answered')

  //         const playback = await call
  //           .playAudio({
  //             url: 'https://cdn.signalwire.com/default-music/welcome.mp3',
  //           })
  //           .onStarted()
  //         await playback.setVolume(10)
  //       } catch (error) {
  //         console.error('Inbound call error', error)
  //       }
  //     },
  //   })

  //   try {
  //     const page = await createCustomPage({ name: '[page]' })
  //     await page.goto(SERVER_URL)

  //     await createCFClient(page)

  //     const resourceName = 'cf-e2e-test-relay'

  //     await page.evaluate(
  //       async (options) => {
  //         // @ts-expect-error
  //         const client = window._client

  //         const call = await client.dial({
  //           to: `/public/${options.resourceName}`,
  //           nodeId: undefined,
  //         })

  //         // @ts-expect-error
  //         window._roomObj = call

  //         await call.start()
  //       },
  //       {
  //         resourceName,
  //       }
  //     )

  //     await expectPageReceiveAudio(page)

  //     // Hangup the call
  //     await page.evaluate(async () => {
  //       // @ts-expect-error
  //       const call = window._roomObj

  //       await call.hangup()
  //     })

  //     await client.disconnect()
  //   } catch (error) {
  //     console.error('CreateRoomSession Error', error)
  //   }
  // })

  test('should connect to the relay app and expect a silence', async ({
    createCustomPage,
  }) => {
    const client = await SignalWire({
      host: process.env.RELAY_HOST,
      project: process.env.RELAY_PROJECT as string,
      token: process.env.RELAY_TOKEN as string,
      debug: {
        logWsTraffic: true,
      },
    })

    let waitForPlaybackStartResolve: () => void
    const waitForPlaybackStart = new Promise<void>((resolve) => {
      waitForPlaybackStartResolve = resolve
    })

    await client.voice.listen({
      topics: ['cf-e2e-test-relay'],
      onCallReceived: async (call) => {
        try {
          console.log('Call received', call.id)

          await call.answer()
          console.log('Inbound call answered')

          const playback = await call.playSilence({ duration: 60 }).onStarted()
          await playback.setVolume(10)

          console.log('Playback silence has started!')

          // Inform the caller playback has started
          waitForPlaybackStartResolve()
        } catch (error) {
          console.error('Inbound call error', error)
        }
      },
    })

    try {
      const page = await createCustomPage({ name: '[page]' })
      await page.goto(SERVER_URL)

      await createCFClient(page)

      const resourceName = 'cf-e2e-test-relay'

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

      console.log('Waiting for the playback start!')

      // Wait until the callee starts the playback
      await waitForPlaybackStart

      console.log('Calculating audio stats')
      const audioStats = await getAudioStats(page)

      expect(audioStats['inbound-rtp']['totalAudioEnergy']).toBeDefined()
      expect(audioStats['inbound-rtp']['totalAudioEnergy']).toBeCloseTo(0.1, 0)

      // Hangup the call
      await page.evaluate(async () => {
        // @ts-expect-error
        const call = window._roomObj

        console.log('hanging up', call)

        await call.hangup()
      })

      await client.disconnect()
    } catch (error) {
      console.error('CreateRoomSession Error', error)
    }
  })

  // test('should connect to the relay app and expect a hangup', async ({
  //   createCustomPage,
  // }) => {
  //   const client = await SignalWire({
  //     host: process.env.RELAY_HOST,
  //     project: process.env.RELAY_PROJECT as string,
  //     token: process.env.RELAY_TOKEN as string,
  //     debug: {
  //       logWsTraffic: true,
  //     },
  //   })

  //   await client.voice.listen({
  //     topics: ['cf-e2e-test-relay'],
  //     onCallReceived: async (call) => {
  //       try {
  //         console.log('Call received', call.id)

  //         await call.answer()
  //         console.log('Inbound call answered')

  //         await call.hangup()
  //       } catch (error) {
  //         console.error('Inbound call error', error)
  //       }
  //     },
  //   })

  //   const page = await createCustomPage({ name: '[page]' })
  //   await page.goto(SERVER_URL)

  //   const resourceName = 'cf-e2e-test-relay'

  //   await createCFClient(page)

  //   // Dial an address and listen a TTS
  //   await page.evaluate(
  //     async ({ resourceName }) => {
  //       // @ts-expect-error
  //       const client = window._client

  //       const call = await client.dial({
  //         to: `/public/${resourceName}`,
  //         nodeId: undefined,
  //       })

  //       // @ts-expect-error
  //       window._roomObj = call

  //       await call.start()
  //     },
  //     { resourceName }
  //   )

  //   await page.waitForTimeout(5000)

  //   const roomSession = await page.evaluate(() => {
  //     // @ts-expect-error
  //     const roomObj = window._roomObj
  //     return roomObj
  //   })

  //   expect(roomSession.state).toBe('destroy')

  //   await client.disconnect()
  // })
})
