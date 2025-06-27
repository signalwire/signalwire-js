import { uuid } from '@signalwire/core'
import { test } from '../../fixtures'
import {
  SERVER_URL,
  createCFClient,
  dialAddress,
  expectCFFinalEvents,
  expectCFInitialEvents,
  expectPageReceiveAudio,
} from '../../utils'

test.describe('CallFabric SWML', () => {
  const swmlTTS = {
    sections: {
      main: [
        'answer',
        {
          play: {
            volume: 10,
            urls: [
              'say:Hi',
              'say:Welcome to SignalWire',
              "say:Thank you for calling us. All our lines are currently busy, but your call is important to us. Please hang up, and we'll return your call as soon as our representative is available.",
              "say:Thank you for calling us. All our lines are currently busy, but your call is important to us. Please hang up, and we'll return your call as soon as our representative is available.",
            ],
          },
        },
      ],
    },
  }
  const swmlHangup = {
    version: '1.0.0',
    sections: {
      main: [
        'answer',
        {
          hangup: {
            reason: 'busy',
          },
        },
      ],
    },
  }

  test('should dial an address and expect a TTS audio', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const resourceName = `e2e-swml-app_${uuid()}`
    await resource.createSWMLAppResource({
      name: resourceName,
      contents: swmlTTS,
    })

    await createCFClient(page)

    // Dial an address and listen a TTS
    await dialAddress(page, {
      address: `/private/${resourceName}`,
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

    await expectInitialEvents

    await expectPageReceiveAudio(page)

    await expectCFFinalEvents(page)
  })

  test('should dial an address and expect a hangup', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const resourceName = `e2e-swml-app_${uuid()}`
    await resource.createSWMLAppResource({
      name: resourceName,
      contents: swmlHangup,
    })

    await createCFClient(page)

    // Dial an address and listen a TTS
    await dialAddress(page, {
      address: `/private/${resourceName}`,
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

    await expectInitialEvents
    await expectFinalEvents
  })
})
