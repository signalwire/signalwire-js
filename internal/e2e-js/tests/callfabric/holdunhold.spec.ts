import { uuid } from '@signalwire/core'
import type { FabricRoomSession } from '@signalwire/browser-js'
import { test, expect } from '../../fixtures'
import {
  createCFClient,
  dialAddress,
  expectMCUVisible,
  expectStatWithPolling,
  getStats,
  SERVER_URL,
  waitForStabilizedStats,
} from '../../utils'

test.describe('CallFabric Hold/Unhold Call', () => {
  test('should dial a call and be able to hold/unhold the call', async ({
    createCustomPage,
    resource,
  }) => {
    const pageOne = await createCustomPage({ name: '[page-one]' })
    const pageTwo = await createCustomPage({ name: '[page-two]' })
    await pageOne.goto(SERVER_URL)
    await pageTwo.goto(SERVER_URL)

    const roomName = `e2e-hold-unhold_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await test.step('[page-one] should create a client and dial a call', async () => {
      await createCFClient(pageOne)
      await dialAddress(pageOne, {
        address: `/public/${roomName}?channel=video`,
      })
      await expectMCUVisible(pageOne)
    })

    await test.step('[page-two] should create a client and dial a call', async () => {
      await createCFClient(pageTwo)
      await dialAddress(pageTwo, {
        address: `/public/${roomName}?channel=video`,
      })
      await expectMCUVisible(pageTwo)
    })

    await test.step('[page-one] should have incoming/outgoing audio/video streams', async () => {
      const stats = await getStats(pageOne)
      expect(stats.outboundRTP.audio?.packetsSent).toBeGreaterThan(0)
      expect(stats.inboundRTP.audio?.packetsReceived).toBeGreaterThan(0)
      expect(stats.outboundRTP.video?.packetsSent).toBeGreaterThan(0)
      expect(stats.inboundRTP.video?.packetsReceived).toBeGreaterThan(0)
    })

    await test.step('[page-one] should hold the call', async () => {
      await pageOne.evaluate(async () => {
        // @ts-expect-error
        const roomObj: FabricRoomSession = window._roomObj
        await roomObj.hold()
      })
    })

    await test.step('[page-one] should have stopped receiving audio/video streams', async () => {
      await waitForStabilizedStats(pageOne, {
        propertyPath: 'inboundRTP.audio.packetsReceived',
      })
      await waitForStabilizedStats(pageOne, {
        propertyPath: 'inboundRTP.video.packetsReceived',
      })
    })

    await test.step('[page-one] should uhold the call', async () => {
      await pageOne.evaluate(async () => {
        // @ts-expect-error
        const roomObj: FabricRoomSession = window._roomObj
        await roomObj.unhold()
      })
    })

    await test.step('[page-one] should have resumed receiving audio/video streams', async () => {
      await expectStatWithPolling(pageOne, {
        propertyPath: 'inboundRTP.audio.packetsReceived',
        matcher: 'toBeGreaterThan',
        expected: 0,
      })
      await expectStatWithPolling(pageOne, {
        propertyPath: 'inboundRTP.video.packetsReceived',
        matcher: 'toBeGreaterThan',
        expected: 0,
      })
    })
  })
})
