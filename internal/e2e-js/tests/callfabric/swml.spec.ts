import { uuid } from '@signalwire/core'
import { test } from '../../fixtures'
import {
  SERVER_URL,
  createCFClient,
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

    page.resetWsTraffic()
    // Dial an address and listen a TTS
    await page.evaluate(
      async ({ resourceName }) => {
        return new Promise<any>(async (resolve, _reject) => {
          // @ts-expect-error
          const client = window._client

          const call = await client.dial({
            to: `/private/${resourceName}`,
            rootElement: document.getElementById('rootElement'),
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

    await expectInitialEvents

    await expectPageReceiveAudio(page)

    await page.evaluate(async () => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj
      return new Promise<boolean>((resolve) => {
        roomObj.on('call.play', (params: any) => {
          if (params.state === 'finished') resolve(true)
        })
        // Server hangup before the event propagation
        roomObj.on('destroy', (params: any) => resolve(false))
      })
    })

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
    await page.evaluate(
      async ({ resourceName }) => {
        return new Promise<any>(async (resolve, _reject) => {
          // @ts-expect-error
          const client = window._client

          const call = await client.dial({
            to: `/private/${resourceName}`,
            rootElement: document.getElementById('rootElement'),
          })

          // @ts-expect-error
          window._roomObj = call

          resolve(call)
        })
      },
      { resourceName }
    )

    const expectInitialEvents = expectCFInitialEvents(page)

    await page.evaluate(async () => {
      // @ts-expect-error
      const call = window._roomObj

      await call.start()
    })

    await expectInitialEvents
  })
})
