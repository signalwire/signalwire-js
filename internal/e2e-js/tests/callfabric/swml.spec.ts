import { test, expect } from '../../fixtures'
import { SERVER_URL, createCFClient, expectPageReceiveAudio, listenCallEvent } from '../../utils'

test.describe('CallFabric SWML', () => {
  test('should dial an address and expect a TTS audio', async ({
    createCustomPage,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const resourceName = 'cf-e2e-test-tts'

    await createCFClient(page)

    // Dial an address and listen a TTS
    await page.evaluate(
      async ({ resourceName }) => {
        return new Promise<any>(async (resolve, _reject) => {
          // @ts-expect-error
          const client = window._client

          const call = await client.dial({
            to: `/public/${resourceName}`,
            logLevel: 'debug',
            debug: { logWsTraffic: true },
            nodeId: undefined,
          })

          // @ts-expect-error
          window._roomObj = call

          await call.start()

          resolve(call)
        })
      },
      { resourceName }
    )

    await expectPageReceiveAudio(page)

    // Hangup the call
    await page.evaluate(async () => {
      // @ts-expect-error
      const call = window._roomObj

      await call.hangup()
    })
  })

  test('should dial an address and expect a hangup', async ({
    createCustomPage,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const resourceName = 'cf-e2e-test-hangup'

    await createCFClient(page)

    // Dial an address and listen a TTS
    const call = await page.evaluate(
      async ({ resourceName }) => {
        return new Promise<any>(async (resolve, _reject) => {
          // @ts-expect-error
          const client = window._client

          const call = await client.dial({
            to: `/public/${resourceName}`,
            nodeId: undefined,
          })

          // @ts-expect-error
          window._roomObj = call

          await call.start()

          resolve(call)
        })
      },
      { resourceName }
    )

    expect(await listenCallEvent(page, 'call.state')).toBeDefined()

    await page.waitForTimeout(1000)

    const roomSession = await page.evaluate(() => {
      // @ts-expect-error
      const roomObj = window._roomObj
      return roomObj
    })

    expect(roomSession.state).toBe('destroy')
  })
})
