import { uuid } from '@signalwire/core'
import {
  createCFClient,
  dialAddress,
  expectCFFinalEvents,
  expectCFInitialEvents,
  expectPageReceiveAudio,
  getAudioStats,
  SERVER_URL,
} from '../../utils'
import { test, expect } from '../../fixtures'

test.describe('CallCall Relay Application', () => {
  test('should connect to the relay app and expect an audio playback', async ({
    createCustomPage,
    resource,
    relayAppClient,
  }) => {
    const topic = `e2e_${uuid()}`
    await resource.createRelayAppResource({
      name: topic,
      topic,
    })

    // Start the relay app in Node.js context
    await relayAppClient.start('playAudio', {
      host: process.env.RELAY_HOST,
      project: process.env.RELAY_PROJECT,
      token: process.env.RELAY_TOKEN,
      topic,
      debug: { logWsTraffic: true },
    })

    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    await createCFClient(page)

    await dialAddress(page, {
      address: `/private/${topic}`,
      shouldWaitForJoin: false,
      shouldStartCall: false,
    })

    const callPlayStarted = page.evaluate(async () => {
      // @ts-expect-error
      const callObj: Video.RoomSession = window._callObj
      return new Promise<boolean>((resolve) => {
        callObj.on('call.play', (params: any) => {
          if (params.state === 'playing') resolve(true)
        })
      })
    })

    const expectInitialEvents = expectCFInitialEvents(page, [callPlayStarted])

    await page.evaluate(async () => {
      // @ts-expect-error
      const call = window._callObj

      await call.start()
    })

    console.log('Waiting for playback start!')

    // Wait until the callee join and starts the playback
    await expectInitialEvents

    // Wait for playback to start on relay app side
    const playbackEvent = await relayAppClient.waitForEvent('playbackStarted')
    
    console.log('Calculating audio stats')
    await expectPageReceiveAudio(page)

    // stop relayApp playback
    await relayAppClient.stopPlayback(playbackEvent.playbackId)

    await page.evaluate(async () => {
      // @ts-expect-error
      const callObj: Video.RoomSession = window._callObj
      return new Promise<boolean>((resolve) => {
        callObj.on('call.play', (params: any) => {
          if (params.state === 'finished') resolve(true)
        })
      })
    })

    const expectFinalEvents = expectCFFinalEvents(page)

    // Hangup the call
    await page.evaluate(async () => {
      // @ts-expect-error
      const call = window._callObj

      await call.hangup()
    })

    await expectFinalEvents

    await relayAppClient.stop()
  })

  test('should connect to the relay app and expect a silence', async ({
    createCustomPage,
    resource,
    relayAppClient,
  }) => {
    const topic = `e2e_${uuid()}`
    await resource.createRelayAppResource({
      name: topic,
      topic,
    })

    // Start the relay app in Node.js context
    await relayAppClient.start('playSilence', {
      host: process.env.RELAY_HOST,
      project: process.env.RELAY_PROJECT,
      token: process.env.RELAY_TOKEN,
      topic,
      debug: { logWsTraffic: true },
    })

    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    await createCFClient(page)

    await dialAddress(page, {
      address: `/private/${topic}?channel=video`,
      shouldWaitForJoin: false,
      shouldStartCall: false,
    })

    const callPlayStarted = page.evaluate(async () => {
      // @ts-expect-error
      const callObj: Video.RoomSession = window._callObj
      return new Promise<boolean>((resolve) => {
        callObj.on('call.play', (params: any) => {
          if (params.state === 'playing') resolve(true)
        })
      })
    })

    const expectInitialEvents = expectCFInitialEvents(page, [callPlayStarted])

    await page.evaluate(async () => {
      // @ts-expect-error
      const call = window._callObj

      await call.start()
    })

    console.log('Waiting for the playback silence start!')

    // Wait until the callee join and starts the playback
    await expectInitialEvents

    // Wait for playback to start on relay app side
    const playbackEvent = await relayAppClient.waitForEvent('playbackStarted')

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
      console.log(
        'Warning - totalAudioEnergy was not present in the audioStats.'
      )
    }
    
    // Stop playback
    await relayAppClient.stopPlayback(playbackEvent.playbackId)
    
    await page.evaluate(async () => {
      // @ts-expect-error
      const callObj: Video.RoomSession = window._callObj
      return new Promise<boolean>((resolve) => {
        callObj.on('call.play', (params: any) => {
          if (params.state === 'finished') resolve(true)
        })
      })
    })

    const expectFinalEvents = expectCFFinalEvents(page)

    // Hangup the call
    await page.evaluate(async () => {
      // @ts-expect-error
      const call = window._callObj

      await call.hangup()
    })

    await expectFinalEvents

    await relayAppClient.stop()
  })

  test('should connect to the relay app and expect a hangup', async ({
    createCustomPage,
    resource,
    relayAppClient,
  }) => {
    const topic = `e2e_${uuid()}`
    await resource.createRelayAppResource({
      name: topic,
      topic,
    })

    // Start the relay app in Node.js context
    await relayAppClient.start('hangup', {
      host: process.env.RELAY_HOST,
      project: process.env.RELAY_PROJECT,
      token: process.env.RELAY_TOKEN,
      topic,
      debug: { logWsTraffic: true },
    })

    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    await createCFClient(page)

    await dialAddress(page, {
      address: `/private/${topic}?channel=video`,
      shouldWaitForJoin: false,
      shouldStartCall: false,
    })

    const expectInitialEvents = expectCFInitialEvents(page)
    const expectFinalEvents = expectCFFinalEvents(page)

    await page.evaluate(async () => {
      // @ts-expect-error
      const call = window._callObj

      await call.start()
    })

    console.log('Waiting for the hangup from the callee!')

    // Wait until the callee join and hangup the call
    await expectInitialEvents
    await expectFinalEvents

    await relayAppClient.stop()
  })
})