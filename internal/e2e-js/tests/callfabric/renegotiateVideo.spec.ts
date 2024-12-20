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
  test('it should enable video with "sendrecv" and then disable with "inactive"', async ({
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

    const stats1 = await getStats(page)
    expect(stats1.outboundRTP.audio?.packetsSent).toBeGreaterThan(0)
    expect(stats1.inboundRTP.audio?.packetsReceived).toBeGreaterThan(0)
    expect(stats1.outboundRTP.video?.packetsSent).toBe(0)
    expect(stats1.inboundRTP.video?.packetsReceived).toBe(0)

    await page.evaluate(async () => {
      // @ts-expect-error
      const cfRoomSession: CallFabricRoomSession = window._roomObj
      await cfRoomSession.setVideoDirection('sendrecv')
    })

    // Expect MCU is visible
    await expectMCUVisible(page)

    const stats2 = await getStats(page)
    expect(stats2.outboundRTP.audio?.packetsSent).toBeGreaterThan(0)
    expect(stats2.inboundRTP.audio?.packetsReceived).toBeGreaterThan(0)
    expect(stats2.outboundRTP.video?.packetsSent).toBeGreaterThan(0)
    expect(stats2.inboundRTP.video?.packetsReceived).toBeGreaterThan(0)

    await test.step('it should disable the video with "inactive"', async () => {
      await page.evaluate(async () => {
        // @ts-expect-error
        const cfRoomSession: CallFabricRoomSession = window._roomObj
        await cfRoomSession.updateMedia({
          video: { enable: false, direction: 'none' },
        })
      })

      const stats3 = await getStats(page)
      expect(stats3.outboundRTP.audio?.packetsSent).toBeGreaterThan(0)
      expect(stats3.inboundRTP.audio?.packetsReceived).toBeGreaterThan(0)
      await expect
        .poll(
          async () => {
            const stats = await getStats(page)
            return stats.outboundRTP.video?.packetsSent
          },
          {
            message: 'should have 0 video packets sent',
            timeout: 5000,
          }
        )
        .toBe(0)
      await expect
        .poll(
          async () => {
            const stats = await getStats(page)
            return stats.inboundRTP.video?.packetsReceived
          },
          {
            message: 'should have 0 video packets received',
            timeout: 5000,
          }
        )
        .toBe(0)
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

    const stats1 = await getStats(page)
    expect(stats1.outboundRTP.audio?.packetsSent).toBeGreaterThan(0)
    expect(stats1.inboundRTP.audio?.packetsReceived).toBeGreaterThan(0)
    expect(stats1.outboundRTP.video?.packetsSent).toBe(0)
    expect(stats1.inboundRTP.video?.packetsReceived).toBe(0)

    await page.evaluate(async () => {
      // @ts-expect-error
      const cfRoomSession: CallFabricRoomSession = window._roomObj
      await cfRoomSession.setVideoDirection('send')
    })

    // Expect MCU is not visible
    await expectMCUNotVisible(page)

    const stats2 = await getStats(page)
    expect(stats2.outboundRTP.audio?.packetsSent).toBeGreaterThan(0)
    expect(stats2.inboundRTP.audio?.packetsReceived).toBeGreaterThan(0)
    await expect
      .poll(
        async () => {
          const stats = await getStats(page)
          return stats.outboundRTP.video?.packetsSent
        },
        {
          message: 'should have more than 0 video packets sent',
          timeout: 5000,
        }
      )
      .toBeGreaterThan(0)
    await expect
      .poll(
        async () => {
          const stats = await getStats(page)
          return stats.inboundRTP.video?.packetsReceived
        },
        {
          message: 'should have 0 video packets received',
          timeout: 5000,
        }
      )
      .toBe(0)

    await test.step('it should disable the video with "recvonly"', async () => {
      await page.evaluate(async () => {
        // @ts-expect-error
        const cfRoomSession: CallFabricRoomSession = window._roomObj
        await cfRoomSession.updateMedia({
          video: { enable: false, direction: 'receive' },
        })
      })

      const stats3 = await getStats(page)
      expect(stats3.outboundRTP.audio?.packetsSent).toBeGreaterThan(0)
      expect(stats3.inboundRTP.audio?.packetsReceived).toBeGreaterThan(0)
      await expect
        .poll(
          async () => {
            const stats = await getStats(page)
            return stats.outboundRTP.video?.packetsSent
          },
          {
            message: 'should have 0 video packets sent',
            timeout: 5000,
          }
        )
        .toBe(0)
      await expect
        .poll(
          async () => {
            const stats = await getStats(page)
            return stats.inboundRTP.video?.packetsReceived
          },
          {
            message: 'should have more than 0 video packets received',
            timeout: 5000,
          }
        )
        .toBeGreaterThan(0)
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
      const cfRoomSession: CallFabricRoomSession = window._roomObj
      await cfRoomSession.setVideoDirection('receive')
    })

    // Expect incoming video stream is visible
    await expectMCUVisibleForAudience(page)

    const stats2 = await getStats(page)
    expect(stats2.outboundRTP.audio?.packetsSent).toBeGreaterThan(0)
    expect(stats2.inboundRTP.audio?.packetsReceived).toBeGreaterThan(0)
    expect(stats2.outboundRTP.video?.packetsSent).toBe(0)
    await expect
      .poll(
        async () => {
          const stats = await getStats(page)
          return stats.inboundRTP.video?.packetsReceived
        },
        {
          message: 'should have more than 0 video packets received',
          timeout: 5000,
        }
      )
      .toBeGreaterThan(0)

    await test.step('it should disable the video with "inactive"', async () => {
      await page.evaluate(async () => {
        // @ts-expect-error
        const cfRoomSession: CallFabricRoomSession = window._roomObj
        await cfRoomSession.updateMedia({
          video: { enable: false, direction: 'none' },
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
