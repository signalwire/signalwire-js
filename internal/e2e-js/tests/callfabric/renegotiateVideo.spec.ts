import { uuid } from '@signalwire/core'
import { test, expect } from '../../fixtures'
import {
  SERVER_URL,
  createCFClient,
  dialAddress,
  expectMCUNotVisible,
  expectMCUVisible,
  expectMCUVisibleForAudience,
  getStats,
} from '../../utils'
import { CallFabricRoomSession } from '@signalwire/js'

test.describe('CallFabric Video Renegotiation', () => {
  test('it should enable video with "sendrecv" and then disable', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e-video-room_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page)

    // Dial an address with audio only channel
    await dialAddress(page, {
      address: `/public/${roomName}?channel=audio`,
    })

    const stats = await getStats(page)
    expect(stats.outboundRTP).not.toHaveProperty('video')
    expect(stats.inboundRTP).not.toHaveProperty('video')
    expect(stats.inboundRTP.audio.packetsReceived).toBeGreaterThan(0)

    await page.evaluate(async () => {
      // @ts-expect-error
      const cfRoomSession: CallFabricRoomSession = window._roomObj
      await cfRoomSession.enableVideo()
    })

    // Expect MCU is visible
    await expectMCUVisible(page)

    const newStats = await getStats(page)
    expect(newStats.outboundRTP).toHaveProperty('video')
    expect(newStats.inboundRTP).toHaveProperty('video')

    await test.step('it should disable the video', async () => {
      await page.evaluate(async () => {
        // @ts-expect-error
        const cfRoomSession: CallFabricRoomSession = window._roomObj
        await cfRoomSession.disableVideo()
      })

      const statsAfterDisabling = await getStats(page)
      expect(statsAfterDisabling.inboundRTP).not.toHaveProperty('video')
      if (statsAfterDisabling.outboundRTP.video) {
        expect(statsAfterDisabling.outboundRTP.video.packetsSent).toBe(0)
      } else {
        expect(statsAfterDisabling.outboundRTP).not.toHaveProperty('video')
      }
    })
  })

  test('it should enable video with "sendonly" and then disable with "recvonly"', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e-video-room_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page)

    // Dial an address with audio only channel
    await dialAddress(page, {
      address: `/public/${roomName}?channel=audio`,
    })

    const stats = await getStats(page)
    expect(stats.outboundRTP).not.toHaveProperty('video')
    expect(stats.inboundRTP).not.toHaveProperty('video')
    expect(stats.inboundRTP.audio.packetsReceived).toBeGreaterThan(0)

    await page.evaluate(async () => {
      // @ts-expect-error
      const cfRoomSession: CallFabricRoomSession = window._roomObj
      await cfRoomSession.enableVideo({ video: true, negotiateVideo: false })
    })

    // Expect MCU is not visible
    await expectMCUNotVisible(page)

    const newStats = await getStats(page)
    expect(newStats.outboundRTP).toHaveProperty('video')
    expect(newStats.inboundRTP).not.toHaveProperty('video')

    await test.step('it should disable the video with "recvonly"', async () => {
      await page.evaluate(async () => {
        // @ts-expect-error
        const cfRoomSession: CallFabricRoomSession = window._roomObj
        await cfRoomSession.disableVideo({ negotiateVideo: true })
      })

      const statsAfterDisabling = await getStats(page)
      expect(statsAfterDisabling.inboundRTP).toHaveProperty('video')
      if (statsAfterDisabling.outboundRTP.video) {
        expect(statsAfterDisabling.outboundRTP.video.packetsSent).toBe(0)
      } else {
        expect(statsAfterDisabling.outboundRTP).not.toHaveProperty('video')
      }
    })
  })

  test('it should enable video with "recvonly" and then disable', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e-video-room_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page)

    // Dial an address with audio only channel
    await dialAddress(page, {
      address: `/public/${roomName}?channel=audio`,
    })

    const stats = await getStats(page)
    expect(stats.outboundRTP).not.toHaveProperty('video')
    expect(stats.inboundRTP).not.toHaveProperty('video')
    expect(stats.inboundRTP.audio.packetsReceived).toBeGreaterThan(0)

    await page.evaluate(async () => {
      // @ts-expect-error
      const cfRoomSession: CallFabricRoomSession = window._roomObj
      await cfRoomSession.enableVideo({ video: false, negotiateVideo: true })
    })

    // Expect incoming video stream is visible
    await expectMCUVisibleForAudience(page)

    const newStats = await getStats(page)
    expect(newStats.outboundRTP).not.toHaveProperty('video')
    expect(newStats.inboundRTP).toHaveProperty('video')

    await test.step('it should disable the video', async () => {
      await page.evaluate(async () => {
        // @ts-expect-error
        const cfRoomSession: CallFabricRoomSession = window._roomObj
        await cfRoomSession.disableVideo()
      })

      const statsAfterDisabling = await getStats(page)
      expect(statsAfterDisabling.inboundRTP).not.toHaveProperty('video')
      if (statsAfterDisabling.outboundRTP.video) {
        expect(statsAfterDisabling.outboundRTP.video.packetsSent).toBe(0)
      } else {
        expect(statsAfterDisabling.outboundRTP).not.toHaveProperty('video')
      }
    })
  })
})
