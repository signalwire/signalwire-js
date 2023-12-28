import { test, expect } from '../../fixtures'
import {
  SERVER_URL,
  createCFClient,
  expectPageReceiveAudio,
  pageEmittedEvents,
} from '../../utils'
import { callAnsweredEvents, callEndingEvents, roomEndedEvents, roomStartedEvents, ttsFinishedEvents, ttsPlayingEvents } from './expectedEvents'

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
            logLevel: 'debug',
            debug: { logWsTraffic: true },
            nodeId: undefined,
          })

          // @ts-expect-error
          window._roomObj = call

          resolve(call)
        })
      },
      { resourceName }
    )

    const stateCreatedEventsPromise = pageEmittedEvents(page, roomStartedEvents)

    const stateAnsweredEventsPromise = pageEmittedEvents(page, callAnsweredEvents)

    const statePlayPlayingEventsPromise = pageEmittedEvents(page, ttsPlayingEvents)

    const statePlayFinishedEventsPromise = pageEmittedEvents(page, ttsFinishedEvents)

    const stateEndingEventsPromise = pageEmittedEvents(page, callEndingEvents)

    const stateEndedEventsPromise = pageEmittedEvents(page, roomEndedEvents)

    await page.evaluate(async () => {
      // @ts-expect-error
      const call = window._roomObj

      await call.start()
    })
    expect(await stateCreatedEventsPromise).toBeTruthy()

    expect(await stateAnsweredEventsPromise).toBeTruthy()

    expect(await statePlayPlayingEventsPromise).toBeTruthy()

    await expectPageReceiveAudio(page)

    expect(await statePlayFinishedEventsPromise).toBeTruthy()

    // Hangup the call
    await page.evaluate(async () => {
      // @ts-expect-error
      const call = window._roomObj

      await call.hangup()
    })

    expect(await stateEndingEventsPromise).toBeTruthy()

    expect(await stateEndedEventsPromise).toBeTruthy()
  })

  test.skip('should dial an address and expect a hangup', async ({
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
            nodeId: undefined,
          })

          // @ts-expect-error
          window._roomObj = call

          resolve(call)
        })
      },
      { resourceName }
    )

        const stateCreatedEventsPromise = pageEmittedEvents(
          page,
          roomStartedEvents
        )

        const stateAnsweredEventsPromise = pageEmittedEvents(
          page,
          callAnsweredEvents
        )

        const stateEndingEventsPromise = pageEmittedEvents(
          page,
          callEndingEvents
        )

        const stateEndedEventsPromise = pageEmittedEvents(page, roomEndedEvents)

    await page.evaluate(async () => {
      // @ts-expect-error
      const call = window._roomObj

      await call.start()
    })

    expect(await stateCreatedEventsPromise).toBeTruthy()

    expect(await stateAnsweredEventsPromise).toBeTruthy()

    expect(await stateEndingEventsPromise).toBeTruthy()

    expect(await stateEndedEventsPromise).toBeTruthy()

    const roomSession = await page.evaluate(() => {
      // @ts-expect-error
      const roomObj = window._roomObj
      return roomObj
    })

    expect(roomSession.state).toBe('destroy')
  })
})
