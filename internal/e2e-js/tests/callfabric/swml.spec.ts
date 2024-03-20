import { test } from '../../fixtures'
import {
  SERVER_URL,
  createCFClient,
  expectCFFinalEvents,
  expectCFInitialEvents,
  expectPageReceiveAudio,
} from '../../utils'

test.describe('CallFabric SWML', () => {
  test('should dial an address and expect a TTS audio', async ({
    createCustomPage,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const resourceName = process.env.RESOURCE_NAME ?? '/public/cf-e2e-test-tts'
    console.log(`#### Dialing ${resourceName}`)

    await createCFClient(page)

    // Dial an address and listen a TTS
    await page.evaluate(
      async ({ resourceName }) => {
        return new Promise<any>(async (resolve, _reject) => {
          // @ts-expect-error
          const client = window._client

          const call = await client.dial({
            to: resourceName,
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
  })

  test('should dial an address and expect a hangup', async ({
    createCustomPage,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const resourceName =
      process.env.RESOURCE_NAME ?? '/public/cf-e2e-test-hangup'

    await createCFClient(page)

    // Dial an address and listen a TTS
    await page.evaluate(
      async ({ resourceName }) => {
        return new Promise<any>(async (resolve, _reject) => {
          // @ts-expect-error
          const client = window._client

          const call = await client.dial({
            to: resourceName,
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

    await expectInitialEvents
    await expectFinalEvents
  })
})
