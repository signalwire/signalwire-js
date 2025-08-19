import { uuid } from '@signalwire/core'
import { test, expect } from '../../fixtures'
import {
  SERVER_URL,
  createCFClient,
  createCallStateUtility,
  dialAddress,
} from '../../utils'
import { CallSession } from '@signalwire/client'

test.describe('Dial With Resolvers Pattern', () => {
  test.afterEach(async ({ page }, testInfo) => {
    console.log(testInfo.status)
    //if (['failed', 'timedOut'].includes(testInfo.status || '')) {
    await page.evaluate(() => window._callState?.logHistory())
    //}
  })

  test('should demonstrate the new dialAddress resolver pattern', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[resolver-demo]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page)
    const callState = createCallStateUtility(page)

    const callSession: CallSession = await dialAddress(page, {
      address: `/public/${roomName}?channel=video`,
      shouldWaitForJoin: false,
      shouldStartCall: false,
      shouldListenToEvent: true,
    })

    // Verify the call session was created
    expect(callSession).toBeDefined()

    await page.waitForFunction(() => {
      // origin_call_id is defined by the call.joined event
      return !!window._callState?.getState().origin_call_id
    })

    // Trigger mute action
    await page.evaluate(async () => {
      const callObj = window._callObj
      await callObj!.audioMute()
    })

    await page.waitForFunction(
      () => {
        return window._callState?.getSelfState().audio_muted
      },
      null,
      { timeout: 5_000 }
    )

    // Trigger mute action
    await page.evaluate(async () => {
      const callObj = window._callObj
      await callObj!.audioUnmute()
    })

    await page.waitForFunction(
      () => {
        return !window._callState?.getSelfState().audio_muted
      },
      null,
      { timeout: 5_000 }
    )
  })
})
