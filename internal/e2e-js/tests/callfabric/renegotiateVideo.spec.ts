import { uuid } from '@signalwire/core'
import { FabricRoomSession } from '@signalwire/js'
import { test, expect } from '../../fixtures'
import {
  SERVER_URL,
  createCFClient,
  dialAddress,
  expectMCUNotVisible,
  expectMCUVisible,
  expectMCUVisibleForAudience,
  expectStatWithPolling,
  getStats,
} from '../../utils'

test.describe('CallFabric Video Renegotiation', () => {
  test('it should enable video with "sendrecv" and then disable with "inactive"', async ({
    createCustomPage,
    resource,
    useV4Client,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e-room-video-reneg-${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page, { useV4Client })

    // Dial an address with audio only channel
    await dialAddress(page, {
      address: `/public/${roomName}?channel=audio`,
    })

    const stats1 = await getStats(page)
    expect(stats1.outboundRTP.audio?.packetsSent).toBeGreaterThan(0)
    expect(stats1.inboundRTP.audio?.packetsReceived).toBeGreaterThan(0)
    expect(stats1.outboundRTP.video?.packetsSent).toBe(0)
    expect(stats1.inboundRTP.video?.packetsReceived).toBe(0)

    await page.evaluate(async () => {
      // @ts-expect-error
      const cfRoomSession: FabricRoomSession = window._roomObj
      await cfRoomSession.setVideoDirection('sendrecv')
    })

    // Wait for the MCU to be visible
    await expectMCUVisible(page)

    const stats2 = await getStats(page)
    expect(stats2.outboundRTP.audio?.packetsSent).toBeGreaterThan(0)
    expect(stats2.inboundRTP.audio?.packetsReceived).toBeGreaterThan(0)
    expect(stats2.outboundRTP.video?.packetsSent).toBeGreaterThan(0)
    expect(stats2.inboundRTP.video?.packetsReceived).toBeGreaterThan(0)

    await test.step('it should disable the video with "inactive"', async () => {
      await page.evaluate(async () => {
        // @ts-expect-error
        const cfRoomSession: FabricRoomSession = window._roomObj
        await cfRoomSession.updateMedia({
          video: { direction: 'inactive' },
        })
      })

      const stats3 = await getStats(page)
      expect(stats3.outboundRTP.audio?.packetsSent).toBeGreaterThan(0)
      expect(stats3.inboundRTP.audio?.packetsReceived).toBeGreaterThan(0)
      await expectStatWithPolling(page, {
        propertyPath: 'outboundRTP.video.packetsSent',
        matcher: 'toBe',
        expected: 0,
      })
      await expectStatWithPolling(page, {
        propertyPath: 'inboundRTP.video.packetsReceived',
        matcher: 'toBe',
        expected: 0,
      })
    })
  })

  test('it should enable video with "sendonly" and then disable with "recvonly"', async ({
    createCustomPage,
    resource,
    useV4Client,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e-room-video-reneg-${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page, { useV4Client })

    // Dial an address with audio only channel
    await dialAddress(page, {
      address: `/public/${roomName}?channel=audio`,
    })

    const stats1 = await getStats(page)
    expect(stats1.outboundRTP.audio?.packetsSent).toBeGreaterThan(0)
    expect(stats1.inboundRTP.audio?.packetsReceived).toBeGreaterThan(0)
    expect(stats1.outboundRTP.video?.packetsSent).toBe(0)
    expect(stats1.inboundRTP.video?.packetsReceived).toBe(0)

    await page.evaluate(async () => {
      // @ts-expect-error
      const cfRoomSession: FabricRoomSession = window._roomObj
      await cfRoomSession.setVideoDirection('sendonly')
    })

    // Verify the MCU is not visible
    await expectMCUNotVisible(page)

    const stats2 = await getStats(page)
    expect(stats2.outboundRTP.audio?.packetsSent).toBeGreaterThan(0)
    expect(stats2.inboundRTP.audio?.packetsReceived).toBeGreaterThan(0)
    await expectStatWithPolling(page, {
      propertyPath: 'outboundRTP.video.packetsSent',
      matcher: 'toBeGreaterThan',
      expected: 0,
    })
    await expectStatWithPolling(page, {
      propertyPath: 'inboundRTP.video.packetsReceived',
      matcher: 'toBe',
      expected: 0,
    })

    await test.step('it should disable the video with "recvonly"', async () => {
      await page.evaluate(async () => {
        // @ts-expect-error
        const cfRoomSession: FabricRoomSession = window._roomObj
        await cfRoomSession.updateMedia({
          video: { direction: 'recvonly' },
        })
      })

      const stats3 = await getStats(page)
      expect(stats3.outboundRTP.audio?.packetsSent).toBeGreaterThan(0)
      expect(stats3.inboundRTP.audio?.packetsReceived).toBeGreaterThan(0)
      await expectStatWithPolling(page, {
        propertyPath: 'outboundRTP.video.packetsSent',
        matcher: 'toBe',
        expected: 0,
      })
      await expectStatWithPolling(page, {
        propertyPath: 'inboundRTP.video.packetsReceived',
        matcher: 'toBeGreaterThan',
        expected: 0,
      })
    })
  })

  test('it should enable video with "recvonly" and then disable with "inactive"', async ({
    createCustomPage,
    resource,
    useV4Client,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e-room-video-reneg-${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page, { useV4Client })

    // Dial an address with audio only channel
    await dialAddress(page, {
      address: `/public/${roomName}?channel=audio`,
    })

    const stats1 = await getStats(page)
    expect(stats1.outboundRTP.audio?.packetsSent).toBeGreaterThan(0)
    expect(stats1.inboundRTP.audio?.packetsReceived).toBeGreaterThan(0)
    expect(stats1.outboundRTP.video?.packetsSent).toBe(0)
    expect(stats1.inboundRTP.video?.packetsReceived).toBe(0)

    await page.evaluate(async () => {
      // @ts-expect-error
      const cfRoomSession: FabricRoomSession = window._roomObj
      await cfRoomSession.setVideoDirection('recvonly')
    })

    // Expect incoming video stream is visible
    await expectMCUVisibleForAudience(page)

    const stats2 = await getStats(page)
    expect(stats2.outboundRTP.audio?.packetsSent).toBeGreaterThan(0)
    expect(stats2.inboundRTP.audio?.packetsReceived).toBeGreaterThan(0)
    expect(stats2.outboundRTP.video?.packetsSent).toBe(0)
    await expectStatWithPolling(page, {
      propertyPath: 'inboundRTP.video.packetsReceived',
      matcher: 'toBeGreaterThan',
      expected: 0,
    })

    await test.step('it should disable the video with "inactive"', async () => {
      await page.evaluate(async () => {
        // @ts-expect-error
        const cfRoomSession: FabricRoomSession = window._roomObj
        await cfRoomSession.updateMedia({
          video: { direction: 'inactive' },
        })
      })

      const stats3 = await getStats(page)
      expect(stats3.outboundRTP.audio?.packetsSent).toBeGreaterThan(0)
      expect(stats3.inboundRTP.audio?.packetsReceived).toBeGreaterThan(0)
      expect(stats3.outboundRTP.video?.packetsSent).toBe(0)
      expect(stats3.inboundRTP.video?.packetsReceived).toBe(0)
    })
  })
})
