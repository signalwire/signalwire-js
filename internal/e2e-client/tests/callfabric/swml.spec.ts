import { uuid } from '@signalwire/core'
import { test, expect, CustomPage } from '../../fixtures'
import { CallSession } from '@signalwire/client'
import {
  SERVER_URL,
  createCFClient,
  dialAddress,
  expectCFFinalEvents,
  expectCFInitialEvents,
  expectPageReceiveAudio,
  expectPageEvalToPass,
} from '../../utils'

test.describe('CallCall SWML', () => {
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
    // Scoped variables at test level
    let page = {} as CustomPage
    let resourceName = ''
    let callPlayStartedPromise = {} as Promise<boolean>
    let expectInitialEvents = {} as Promise<
      [[boolean, boolean, boolean], ...boolean[]]
    >
    let expectFinalEvents = {} as Promise<[boolean, ...boolean[]]>

    await test.step('setup page, resource, and client', async () => {
      page = await createCustomPage({ name: '[page]' })
      await page.goto(SERVER_URL)

      resourceName = `e2e_${uuid()}`
      await resource.createSWMLAppResource({
        name: resourceName,
        contents: swmlTTS,
      })

      await createCFClient(page)
    })

    await test.step('dial address', async () => {
      await dialAddress(page, {
        address: `/private/${resourceName}`,
        shouldWaitForJoin: false,
        shouldStartCall: false,
      })
    })

    await test.step('setup call.play event listener', async () => {
      callPlayStartedPromise = expectPageEvalToPass(page, {
        evaluateFn: () => {
          return new Promise<boolean>((resolve) => {
            const callObj = window._callObj

            if (!callObj) {
              throw new Error('Call object not found')
            }

            callObj.on('call.play', (params: { state: string }) => {
              if (params.state === 'playing') resolve(true)
            })
          })
        },
        assertionFn: (result) => {
          expect(
            result,
            'call.play event with playing state should be received'
          ).toBe(true)
        },
        message: 'expect to setup call.play event listener',
      })
    })

    await test.step('setup event expectations', async () => {
      expectInitialEvents = expectCFInitialEvents(page, [
        callPlayStartedPromise,
      ])
      // NOTE: the timeout is extended from the default because this test takes longer to process
      // do to the TTS audio and the time to resolve the expectPageReceiveAudio promise
      expectFinalEvents = expectCFFinalEvents(page, undefined, {
        timeoutMs: 40000,
      })
    })

    await test.step('start the call', async () => {
      await expectPageEvalToPass(page, {
        evaluateFn: async () => {
          const call = window._callObj

          if (!call) {
            throw new Error('Call object not found')
          }

          await call.start()
          return true
        },
        assertionFn: (result) => {
          expect(result, 'call should start successfully').toBe(true)
        },
        message: 'expect to start the call',
      })
    })

    await test.step('wait for events and audio', async () => {
      await expectInitialEvents
      await expectPageReceiveAudio(page)

      await expectFinalEvents
    })
  })

  test('should dial an address and expect a hangup', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const resourceName = `e2e_${uuid()}`
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
