import { uuid } from '@signalwire/core'
import { test, expect } from '../../fixtures'
import {
  SERVER_URL,
  createCFClient,
  dialAddress,
  expectMCUVisible,
  expectStatWithPolling,
  getStats,
  waitForStabilizedStats,
} from '../../utils'
import { CallFabricRoomSession } from '@signalwire/js'

test.describe('CallFabric Audio Renegotiation', () => {
  test('it should enable audio with "sendrecv" and then disable with "inactive"', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e-video-room_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page)

    // Dial an address with video only channel
    await dialAddress(page, {
      address: `/public/${roomName}?channel=video`,
      dialOptions: {
        audio: false,
        negotiateAudio: false,
      },
    })

    // Expect MCU is visible
    await expectMCUVisible(page)

    const stats1 = await getStats(page)
    expect(stats1.outboundRTP.video?.packetsSent).toBeGreaterThan(0)
    expect(stats1.inboundRTP.video?.packetsReceived).toBeGreaterThan(0)
    expect(stats1.outboundRTP.audio?.packetsSent).toBe(0)
    expect(stats1.inboundRTP.audio?.packetsReceived).toBe(0)

    await page.evaluate(async () => {
      // @ts-expect-error
      const cfRoomSession: CallFabricRoomSession = window._roomObj
      await cfRoomSession.setAudioDirection('sendrecv')
    })

    await expectStatWithPolling(page, {
      propertyPath: 'outboundRTP.video.packetsSent',
      matcher: 'toBeGreaterThan',
      expected: 0,
    })
    await expectStatWithPolling(page, {
      propertyPath: 'inboundRTP.video.packetsReceived',
      matcher: 'toBeGreaterThan',
      expected: 0,
    })
    await expectStatWithPolling(page, {
      propertyPath: 'outboundRTP.audio.packetsSent',
      matcher: 'toBeGreaterThan',
      expected: 0,
    })
    await expectStatWithPolling(page, {
      propertyPath: 'inboundRTP.audio.packetsReceived',
      matcher: 'toBeGreaterThan',
      expected: 0,
    })

    await test.step('it should disable the audio with "inactive"', async () => {
      await page.evaluate(async () => {
        // @ts-expect-error
        const cfRoomSession: CallFabricRoomSession = window._roomObj
        await cfRoomSession.updateMedia({
          audio: { enable: false, direction: 'none' },
        })
      })

      await expectStatWithPolling(page, {
        propertyPath: 'outboundRTP.video.packetsSent',
        matcher: 'toBeGreaterThan',
        expected: 0,
      })
      await expectStatWithPolling(page, {
        propertyPath: 'inboundRTP.video.packetsReceived',
        matcher: 'toBeGreaterThan',
        expected: 0,
      })
      await waitForStabilizedStats(page, {
        propertyPath: 'outboundRTP.audio.packetsSent',
      })
      await waitForStabilizedStats(page, {
        propertyPath: 'inboundRTP.audio.packetsReceived',
      })
    })
  })

  test('it should enable audio with "sendonly" and then disable with "recvonly"', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e-video-room_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page)

    // Dial an address with video only channel
    await dialAddress(page, {
      address: `/public/${roomName}?channel=video`,
      dialOptions: {
        audio: false,
        negotiateAudio: false,
      },
    })

    // Expect MCU is visible
    await expectMCUVisible(page)

    const stats1 = await getStats(page)
    expect(stats1.outboundRTP.video?.packetsSent).toBeGreaterThan(0)
    expect(stats1.inboundRTP.video?.packetsReceived).toBeGreaterThan(0)
    expect(stats1.outboundRTP.audio?.packetsSent).toBe(0)
    expect(stats1.inboundRTP.audio?.packetsReceived).toBe(0)

    await page.evaluate(async () => {
      // @ts-expect-error
      const cfRoomSession: CallFabricRoomSession = window._roomObj
      await cfRoomSession.setAudioDirection('send')
    })

    const stats2 = await getStats(page)
    expect(stats2.outboundRTP).toHaveProperty('video')
    expect(stats2.inboundRTP).toHaveProperty('video')
    await expectStatWithPolling(page, {
      propertyPath: 'outboundRTP.audio.packetsSent',
      matcher: 'toBeGreaterThan',
      expected: 0,
    })
    expect(stats2.inboundRTP.audio?.packetsReceived).toBe(0)

    await test.step('it should disable the audio with "recvonly"', async () => {
      await page.evaluate(async () => {
        // @ts-expect-error
        const cfRoomSession: CallFabricRoomSession = window._roomObj
        await cfRoomSession.updateMedia({
          audio: { enable: false, direction: 'receive' },
        })
      })

      const stats3 = await getStats(page)
      expect(stats3.outboundRTP).toHaveProperty('video')
      expect(stats3.inboundRTP).toHaveProperty('video')
      await waitForStabilizedStats(page, {
        propertyPath: 'outboundRTP.audio.packetsSent',
      })
      await expectStatWithPolling(page, {
        propertyPath: 'inboundRTP.audio.packetsReceived',
        matcher: 'toBeGreaterThan',
        expected: 0,
      })
    })
  })

  test('it should enable video with "recvonly" and then disable with "inactive"', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e-video-room_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page)

    // Dial an address with video only channel
    await dialAddress(page, {
      address: `/public/${roomName}?channel=video`,
      dialOptions: {
        audio: false,
        negotiateAudio: false,
      },
    })

    // Expect MCU is visible
    await expectMCUVisible(page)

    const stats1 = await getStats(page)
    expect(stats1.outboundRTP.video?.packetsSent).toBeGreaterThan(0)
    expect(stats1.inboundRTP.video?.packetsReceived).toBeGreaterThan(0)
    expect(stats1.outboundRTP.audio?.packetsSent).toBe(0)
    expect(stats1.inboundRTP.audio?.packetsReceived).toBe(0)

    await page.evaluate(async () => {
      // @ts-expect-error
      const cfRoomSession: CallFabricRoomSession = window._roomObj
      await cfRoomSession.setAudioDirection('receive')
    })

    const stats2 = await getStats(page)
    await expectStatWithPolling(page, {
      propertyPath: 'outboundRTP.video.packetsSent',
      matcher: 'toBeGreaterThan',
      expected: 0,
    })
    await expectStatWithPolling(page, {
      propertyPath: 'inboundRTP.video.packetsReceived',
      matcher: 'toBeGreaterThan',
      expected: 0,
    })
    expect(stats2.outboundRTP.audio?.packetsSent).toBe(0)
    await expectStatWithPolling(page, {
      propertyPath: 'inboundRTP.audio.packetsReceived',
      matcher: 'toBeGreaterThan',
      expected: 0,
    })

    await test.step('it should disable the audio with "inactive"', async () => {
      await page.evaluate(async () => {
        // @ts-expect-error
        const cfRoomSession: CallFabricRoomSession = window._roomObj
        await cfRoomSession.updateMedia({
          audio: { enable: false, direction: 'none' },
        })
      })

      const stats3 = await getStats(page)
      await expectStatWithPolling(page, {
        propertyPath: 'outboundRTP.video.packetsSent',
        matcher: 'toBeGreaterThan',
        expected: 0,
      })
      await expectStatWithPolling(page, {
        propertyPath: 'inboundRTP.video.packetsReceived',
        matcher: 'toBeGreaterThan',
        expected: 0,
      })
      expect(stats3.outboundRTP.audio?.packetsSent).toBe(0)
      await waitForStabilizedStats(page, {
        propertyPath: 'inboundRTP.audio.packetsReceived',
      })
    })
  })
})