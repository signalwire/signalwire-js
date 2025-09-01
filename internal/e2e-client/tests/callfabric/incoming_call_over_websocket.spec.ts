import { CallSession } from '@signalwire/client'
import { test, expect } from '../../fixtures'
import { SERVER_URL, createCFClient, dialAddress } from '../../utils'

test.describe('CallFabric Incoming Call over WebSocket', () => {
  test('should handle incoming call via WebSocket between two subscribers', async ({
    createCustomPage,
  }) => {
    // Create a page named Callee
    const calleePage = await createCustomPage({ name: '[callee]' })
    await calleePage.goto(SERVER_URL)

    // Create a page named Caller
    const callerPage = await createCustomPage({ name: '[caller]' })
    await callerPage.goto(SERVER_URL)

    // Create clients for both pages
    await createCFClient(calleePage, { reference: 'callee' })
    await createCFClient(callerPage, { reference: 'caller' })

    // In Callee page: use client.address.getMyAddresses to find the callee address
    const calleeAddress = await calleePage.evaluate(async () => {
      const client = window._client!
      const addresses = await client.address.getMyAddresses()

      if (!addresses || addresses.length === 0) {
        throw new Error('No addresses found for callee')
      }

      const myAddressId = addresses[0].id
      const myAddress = await client.address.getAddress({ id: myAddressId })
      return myAddress.channels.video
    })

    expect(calleeAddress).toBeTruthy()

    // In Callee page: set up promise to track call events
    const calleeCallAnsweredPromise = calleePage.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        // @ts-expect-error
        window._calleeCallAnswered = resolve
      })
    })

    const calleeCallDestroyedPromise = calleePage.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        // @ts-expect-error
        window._calleeCallDestroyed = resolve
      })
    })

    // In Callee page: use client.online to register a listener for invites over WebSocket only
    await calleePage.evaluate(async () => {
      const client = window._client!

      await client.online({
        incomingCallHandlers: {
          websocket: async (notification) => {
            console.log(
              'Callee received incoming call:',
              notification.invite.details
            )

            // Accept the call
            const calleeCall = notification.invite.accept({
              rootElement: document.getElementById('rootElement')!,
              audio: true,
              video: true,
            })

            // @ts-expect-error
            window._calleeCall = calleeCall

            // Set up event listeners
            calleeCall.on('call.state', (state) => {
              console.log('Callee call state:', state.call_state)
            })

            calleeCall.on('destroy', () => {
              console.log('Callee call destroyed')
              // @ts-expect-error
              window._calleeCallDestroyed(true)
            })

            await calleeCall.start()

            // @ts-expect-error
            window._calleeCallAnswered(true)
          },
        },
      })
    })

    // In Caller: dial the callee address with "?channel=video"
    const callerDialPromise = dialAddress(callerPage, {
      address: calleeAddress ?? '',
      timeoutMs: 9000,
    })

    // Wait for both the caller to connect and callee to answer
    const [callerCallSession, calleeAnswered] = await Promise.all([
      callerDialPromise,
      calleeCallAnsweredPromise,
    ])

    expect(calleeAnswered).toBe(true)
    expect(callerCallSession).toBeDefined()

    // In Caller page: hang up the call
    await callerPage.evaluate(async () => {
      // @ts-expect-error
      const callObj: CallSession = window._callObj
      await callObj.hangup()
    })

    // In Callee page: expect the call to be destroyed
    const calleeDestroyed = await calleeCallDestroyedPromise
    expect(calleeDestroyed).toBe(true)
  })
})
