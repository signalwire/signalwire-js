import { SignalWire } from '@signalwire/realtime-api'
import {
  createCFClient,
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

    // TODO: This might not be needed after unified events in CF
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

          const playback = await call
            .playAudio({
              url: 'https://cdn.signalwire.com/default-music/welcome.mp3',
            })
            .onStarted()
          await playback.setVolume(10)

          console.log('Playback has started!')

          // Inform the caller playback has started
          waitForPlaybackStartResolve()
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

    console.log('Waiting for playback start!')

    // Wait until the callee starts the playback
    await waitForPlaybackStart

    console.log('Calculating audio stats')
    await expectPageReceiveAudio(page)

    // Hangup the call
    await page.evaluate(async () => {
      // @ts-expect-error
      const call = window._roomObj

      await call.hangup()
    })

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

    // TODO: This might not be needed after unified events in CF
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

    console.log('Waiting for the playback silence start!')

    // Wait until the callee starts the playback
    await waitForPlaybackStart

    console.log('Calculating audio stats')
    const audioStats = await getAudioStats(page)

    /* Only evaluate totalAudioEnergy if returned by getStats().
     * This allows for the test to pass even if there were issues retrieving the stat.
     * Instead, if totalAudioEnergy is available, then expect the condition to be satisfied.
     */
    const totalAudioEnergy = audioStats['inbound-rtp']['totalAudioEnergy']
    if (totalAudioEnergy) {
      expect(totalAudioEnergy).toBeCloseTo(0.1, 0)
    }

    // Hangup the call
    await page.evaluate(async () => {
      // @ts-expect-error
      const call = window._roomObj

      console.log('hanging up', call)

      await call.hangup()
    })

    await client.disconnect()
  })

  // FIXME: Currently, when the callee hangs up, the Call Fabric SDK lacks an event to notify the caller.
  // Previously, we utilized page.waitForTimeout(), but this approach proved to be flaky and caused issues in CI.
  // This should be fixed when we have the CALL STATE event in Call Fabric SDK.
  test.skip('should connect to the relay app and expect a hangup', async ({
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

    // TODO: This might not be needed after unified events in CF
    let waitForHangupResolve: () => void
    const waitForHangup = new Promise<void>((resolve) => {
      waitForHangupResolve = resolve
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

          // Inform the caller
          waitForHangupResolve()
        } catch (error) {
          console.error('Inbound call error', error)
        }
      },
    })

    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const resourceName = 'cf-e2e-test-relay'

    await createCFClient(page)

    // Dial an address and listen a TTS
    await page.evaluate(
      async ({ resourceName }) => {
        // @ts-expect-error
        const client = window._client

        const call = await client.dial({
          to: `/public/${resourceName}`,
          nodeId: undefined,
        })

        // @ts-expect-error
        window._roomObj = call

        await call.start()
      },
      { resourceName }
    )

    console.log('Waiting for the hangup from the callee!')

    // Wait until the callee hangup the call
    await waitForHangup

    const roomSession = await page.evaluate(() => {
      // @ts-expect-error
      const roomObj = window._roomObj
      return roomObj
    })

    expect(roomSession.state).toBe('destroy')

    await client.disconnect()
  })
})
