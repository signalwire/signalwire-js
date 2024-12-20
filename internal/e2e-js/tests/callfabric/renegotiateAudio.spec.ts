import { uuid } from '@signalwire/core'
import { test, expect } from '../../fixtures'
import {
  SERVER_URL,
  createCFClient,
  dialAddress,
  expectMCUVisible,
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
    expect(stats1.outboundRTP).not.toHaveProperty('audio')
    expect(stats1.inboundRTP).not.toHaveProperty('audio')

    await page.evaluate(async () => {
      // @ts-expect-error
      const cfRoomSession: CallFabricRoomSession = window._roomObj
      await cfRoomSession.setAudioDirection('sendrecv')
    })

    await expect
      .poll(async () => {
        const stats = await getStats(page)
        return stats.outboundRTP.video?.packetsSent
      })
      .toBeGreaterThan(0)
    await expect
      .poll(async () => {
        const stats = await getStats(page)
        return stats.inboundRTP.video?.packetsReceived
      })
      .toBeGreaterThan(0)
    await expect
      .poll(async () => {
        const stats = await getStats(page)
        return stats.outboundRTP.audio?.packetsSent
      })
      .toBeGreaterThan(0)
    await expect
      .poll(async () => {
        const stats = await getStats(page)
        return stats.inboundRTP.audio?.packetsReceived
      })
      .toBeGreaterThan(0)

    await test.step('it should disable the audio with "inactive"', async () => {
      await page.evaluate(async () => {
        // @ts-expect-error
        const cfRoomSession: CallFabricRoomSession = window._roomObj
        await cfRoomSession.updateMedia({
          audio: { enable: false, direction: 'none' },
        })
      })

      await expect
        .poll(async () => {
          const stats = await getStats(page)
          return stats.outboundRTP.video?.packetsSent
        })
        .toBeGreaterThan(0)
      await expect
        .poll(async () => {
          const stats = await getStats(page)
          return stats.inboundRTP.video?.packetsReceived
        })
        .toBeGreaterThan(0)
      await waitForStabilizedStats(page, {
        path: 'stats.outboundRTP.audio.packetsSent',
      })
      await waitForStabilizedStats(page, {
        path: 'stats.inboundRTP.audio.packetsReceived',
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
    expect(stats1.outboundRTP).not.toHaveProperty('audio')
    expect(stats1.inboundRTP).not.toHaveProperty('audio')

    await page.evaluate(async () => {
      // @ts-expect-error
      const cfRoomSession: CallFabricRoomSession = window._roomObj
      await cfRoomSession.setAudioDirection('send')
    })

    const stats2 = await getStats(page)
    expect(stats2.outboundRTP).toHaveProperty('video')
    expect(stats2.inboundRTP).toHaveProperty('video')
    await expect
      .poll(async () => {
        const stats = await getStats(page)
        return stats.outboundRTP.audio?.packetsSent
      })
      .toBeGreaterThan(0)
    expect(stats2.inboundRTP).not.toHaveProperty('audio')

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
        path: 'stats.outboundRTP.audio?.packetsSent',
      })
      await expect
        .poll(
          async () => {
            const stats = await getStats(page)
            return stats.inboundRTP.audio?.packetsReceived
          },
          {
            message:
              'should have more than 0 audio packets received in inbound-rtp',
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
    expect(stats1.outboundRTP).not.toHaveProperty('audio')
    expect(stats1.inboundRTP).not.toHaveProperty('audio')

    await page.evaluate(async () => {
      // @ts-expect-error
      const cfRoomSession: CallFabricRoomSession = window._roomObj
      await cfRoomSession.setAudioDirection('receive')
    })

    const stats2 = await getStats(page)
    await expect
      .poll(async () => {
        const stats = await getStats(page)
        return stats.outboundRTP.video?.packetsSent
      })
      .toBeGreaterThan(0)
    await expect
      .poll(async () => {
        const stats = await getStats(page)
        return stats.inboundRTP.video?.packetsReceived
      })
      .toBeGreaterThan(0)
    expect(stats2.outboundRTP).not.toHaveProperty('audio')
    await expect
      .poll(
        async () => {
          const stats = await getStats(page)
          return stats.inboundRTP.audio?.packetsReceived
        },
        {
          message:
            'should have more than 0 video packets received in inbound-rtp',
          timeout: 5000,
        }
      )
      .toBeGreaterThan(0)

    await test.step('it should disable the audio with "inactive"', async () => {
      await page.evaluate(async () => {
        // @ts-expect-error
        const cfRoomSession: CallFabricRoomSession = window._roomObj
        await cfRoomSession.updateMedia({
          audio: { enable: false, direction: 'none' },
        })
      })

      await expect
        .poll(async () => {
          const stats = await getStats(page)
          return stats.outboundRTP.video?.packetsSent
        })
        .toBeGreaterThan(0)
      await expect
        .poll(async () => {
          const stats = await getStats(page)
          return stats.inboundRTP.video?.packetsReceived
        })
        .toBeGreaterThan(0)
      expect(stats2.outboundRTP).not.toHaveProperty('audio')
      await waitForStabilizedStats(page, {
        path: 'stats.inboundRTP.audio.packetsReceived',
      })
    })
  })
})
