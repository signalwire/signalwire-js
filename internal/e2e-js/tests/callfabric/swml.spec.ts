import { test } from '../../fixtures'
import { SERVER_URL, createSWClient, expectPageReceiveAudio } from '../../utils'

test.describe('CallFabric SWML', () => {
  test('should dial an address and expect a TTS audio', async ({
    createCustomPage,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const resourceName = 'cf-e2e-test-tts'

    await createSWClient(page)

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
})
