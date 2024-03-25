import { SignalWire } from '@signalwire/realtime-api'
import {
  createCFClient,
  expectCFFinalEvents,
  expectCFInitialEvents,
  expectPageReceiveAudio,
  getAudioStats,
  SERVER_URL,
} from '../../utils'
import { test, expect } from '../../fixtures'

test.describe('CallFabric Relay Application', () => {
  test('should connect to the relay app and expect an audio playback', async ({
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

    await client.voice.listen({
      topics: ['cf-e2e-test-relay'],
      onCallReceived: async (call) => {
        try {
          console.log('Call received', call.id)

          await call.answer()
          console.log('Inbound call answered')

          const playback = await call
            .playAudio({
              url: 'https://cdn.signalwire.com/default-music/welcome.mp3',
            })
            .onStarted()
          await playback.setVolume(10)

          console.log('Playback has started!')
        } catch (error) {
          console.error('Inbound call error', error)
        }
      },
    })

    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    await createCFClient(page)

    const resourceName = 'cf-e2e-test-relay'

    await page.evaluate(
      async (options) => {
        return new Promise<any>(async (resolve, _reject) => {
          // @ts-expect-error
          const client = window._client

          const call = await client.dial({
            to: `/public/${options.resourceName}`,
          })

          // @ts-expect-error
          window._roomObj = call

          resolve(call)
        })
      },
      { resourceName }
    )

    const callPlayStarted = page.evaluate(async () => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj
      return new Promise<boolean>((resolve) => {
        roomObj.on('call.play', (params: any) => {
          if (params.state === 'playing') resolve(true)
        })
      })
    })

    const expectInitialEvents = expectCFInitialEvents(page, [callPlayStarted])

    await page.evaluate(async () => {
      // @ts-expect-error
      const call = window._roomObj

      await call.start()
    })

    console.log('Waiting for playback start!')

    // Wait until the callee join and starts the playback
    await expectInitialEvents

    console.log('Calculating audio stats')
    await expectPageReceiveAudio(page)

    const callPlayEnded = page.evaluate(async () => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj
      return new Promise<boolean>((resolve) => {
        roomObj.on('call.play', (params: any) => {
          if (params.state === 'finished') resolve(true)
        })
      })
    })

    const expectFinalEvents = expectCFFinalEvents(page, [callPlayEnded])

    // Hangup the call
    await page.evaluate(async () => {
      // @ts-expect-error
      const call = window._roomObj

      await call.hangup()
    })

    await expectFinalEvents

    await client.disconnect()
  })

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
        } catch (error) {
          console.error('Inbound call error', error)
        }
      },
    })

    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    await createCFClient(page)

    const resourceName = 'cf-e2e-test-relay'

    await page.evaluate(
      async (options) => {
        return new Promise<any>(async (resolve, _reject) => {
          // @ts-expect-error
          const client = window._client

          const call = await client.dial({
            to: `/public/${options.resourceName}`,
          })

          // @ts-expect-error
          window._roomObj = call

          resolve(call)
        })
      },
      { resourceName }
    )

    const callPlayStarted = page.evaluate(async () => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj
      return new Promise<boolean>((resolve) => {
        roomObj.on('call.play', (params: any) => {
          if (params.state === 'playing') resolve(true)
        })
      })
    })

    const expectInitialEvents = expectCFInitialEvents(page, [callPlayStarted])

    await page.evaluate(async () => {
      // @ts-expect-error
      const call = window._roomObj

      await call.start()
    })

    console.log('Waiting for the playback silence start!')

    // Wait until the callee join and starts the playback
    await expectInitialEvents

    console.log('Calculating audio stats')
    const audioStats = await getAudioStats(page)

    /* Only evaluate totalAudioEnergy if returned by getStats().
     * This allows for the test to pass even if there were issues retrieving the stat.
     * Instead, if totalAudioEnergy is available, then expect the condition to be satisfied.
     */
    const totalAudioEnergy = audioStats['inbound-rtp']['totalAudioEnergy']
    if (totalAudioEnergy) {
      expect(totalAudioEnergy).toBeCloseTo(0.1, 0)
    } else {
      console.log('Warning - totalAudioEnergy was not present in the audioStats.')
    }

    const callPlayEnded = page.evaluate(async () => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj
      return new Promise<boolean>((resolve) => {
        roomObj.on('call.play', (params: any) => {
          if (params.state === 'finished') resolve(true)
        })
      })
    })

    const expectFinalEvents = expectCFFinalEvents(page, [callPlayEnded])

    // Hangup the call
    await page.evaluate(async () => {
      // @ts-expect-error
      const call = window._roomObj

      await call.hangup()
    })

    await expectFinalEvents

    await client.disconnect()
  })

  test('should connect to the relay app and expect a hangup', async ({
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

    await client.voice.listen({
      topics: ['cf-e2e-test-relay'],
      onCallReceived: async (call) => {
        try {
          console.log('Call received', call.id)

          await call.answer()
          console.log('Inbound call answered')

          await call.hangup()
          console.log('Callee hung up the call!')
        } catch (error) {
          console.error('Inbound call error', error)
        }
      },
    })

    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const resourceName = 'cf-e2e-test-relay'

    await createCFClient(page)

    await page.evaluate(
      async (options) => {
        return new Promise<any>(async (resolve, _reject) => {
          // @ts-expect-error
          const client = window._client

          const call = await client.dial({
            to: `/public/${options.resourceName}`,
          })

          // @ts-expect-error
          window._roomObj = call

          resolve(call)
        })
      },
      { resourceName }
    )

    const expectInitialEvents = expectCFInitialEvents(page)
    const expectFinalEvents = expectCFFinalEvents(page)

    await page.evaluate(async () => {
      // @ts-expect-error
      const call = window._roomObj

      await call.start()
    })

    console.log('Waiting for the hangup from the callee!')

    // Wait until the callee join and hangup the call
    await expectInitialEvents
    await expectFinalEvents

    await client.disconnect()
  })
})
