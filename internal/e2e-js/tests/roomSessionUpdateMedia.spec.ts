import { Video } from '@signalwire/js'
import { Page, test, expect } from '../fixtures'
import {
  createTestRoomSession,
  expectMCUVisible,
  expectRoomJoined,
  expectStatWithPolling,
  getStats,
  randomizeRoomName,
  SERVER_URL,
  waitForStabilizedStats,
} from '../utils'

test.describe('RoomSession Update Media', () => {
  const setupAndJoinRoom = async (page: Page) => {
    const roomName = randomizeRoomName('update-media-e2e')
    const memberSettings = {
      vrt: {
        room_name: roomName,
        user_name: 'e2e_participant_meta',
        auto_create_room: true,
      },
    }

    await createTestRoomSession(page, memberSettings)

    // --------------- Joining the room ---------------
    const joinParams = await expectRoomJoined(page)
    expect(joinParams.room).toBeDefined()
    expect(joinParams.room_session).toBeDefined()

    // Checks that the video is visible
    await expectMCUVisible(page)
  }

  test('should join a room be able to update "video" multiple times', async ({
    createCustomPage,
  }) => {
    const page = await createCustomPage({ name: '[update-media]' })
    await page.goto(SERVER_URL)

    // Setup and join the room and expect the MCU is visible
    await test.step('it should join a room and expect the MCU is visible', async () => {
      await setupAndJoinRoom(page)
    })

    await test.step('it should have stats with media packets flowing in both directions', async () => {
      const stats = await getStats(page)
      expect(stats.outboundRTP.audio?.packetsSent).toBeGreaterThan(0)
      expect(stats.inboundRTP.audio?.packetsReceived).toBeGreaterThan(0)
      expect(stats.outboundRTP.video?.packetsSent).toBeGreaterThan(0)
      expect(stats.inboundRTP.video?.packetsReceived).toBeGreaterThan(0)
    })

    let lastAudioPacketsSent = 0,
      lastAudioPacketsReceived = 0

    await test.step('it should update media with video "sendonly" and audio "none"', async () => {
      await page.evaluate(async () => {
        // @ts-expect-error
        const roomSession: Video.RoomSession = window._roomObj
        await roomSession.updateMedia({
          audio: { enable: false, direction: 'none' },
          video: { enable: true, direction: 'send' },
        })
      })

      lastAudioPacketsSent = await waitForStabilizedStats(page, {
        propertyPath: 'outboundRTP.audio.packetsSent',
      })
      lastAudioPacketsReceived = await waitForStabilizedStats(page, {
        propertyPath: 'inboundRTP.audio.packetsReceived',
      })
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
    })

    await test.step('it should update media with video direction "sendrecv"', async () => {
      await page.evaluate(async () => {
        // @ts-expect-error
        const roomSession: Video.RoomSession = window._roomObj
        await roomSession.setVideoDirection('sendrecv')
      })

      const stats = await getStats(page)
      expect(stats.outboundRTP.audio?.packetsSent).toBe(lastAudioPacketsSent)
      expect(stats.inboundRTP.audio?.packetsReceived).toBe(
        lastAudioPacketsReceived
      )
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
    })

    await test.step('it should update media with video "recvonly" and audio "sendrecv"', async () => {
      await page.evaluate(async () => {
        // @ts-expect-error
        const roomSession: Video.RoomSession = window._roomObj
        await roomSession.updateMedia({
          audio: { enable: true, direction: 'sendrecv' },
          video: { enable: false, direction: 'receive' },
        })
      })

      await expectStatWithPolling(page, {
        propertyPath: 'outboundRTP.audio.packetsSent',
        matcher: 'toBeGreaterThan',
        expected: lastAudioPacketsSent,
      })
      await expectStatWithPolling(page, {
        propertyPath: 'inboundRTP.audio.packetsReceived',
        matcher: 'toBeGreaterThan',
        expected: lastAudioPacketsReceived,
      })
      await waitForStabilizedStats(page, {
        propertyPath: 'outboundRTP.video.packetsSent',
      })
      await expectStatWithPolling(page, {
        propertyPath: 'inboundRTP.video.packetsReceived',
        matcher: 'toBeGreaterThan',
        expected: 0,
      })
    })
  })

  test('should join a room be able to update "audio" multiple times', async ({
    createCustomPage,
  }) => {
    const page = await createCustomPage({ name: '[update-media]' })
    await page.goto(SERVER_URL)

    // Setup and join the room and expect the MCU is visible
    await test.step('it should join a room and expect the MCU is visible', async () => {
      await setupAndJoinRoom(page)
    })

    await test.step('it should have stats with media packets flowing in both directions', async () => {
      const stats = await getStats(page)
      expect(stats.outboundRTP.audio?.packetsSent).toBeGreaterThan(0)
      expect(stats.inboundRTP.audio?.packetsReceived).toBeGreaterThan(0)
      expect(stats.outboundRTP.video?.packetsSent).toBeGreaterThan(0)
      expect(stats.inboundRTP.video?.packetsReceived).toBeGreaterThan(0)
    })

    let lastVideoPacketsSent = 0,
      lastVideoPacketsReceived = 0

    await test.step('it should update media with audio "sendonly" and video "none"', async () => {
      await page.evaluate(async () => {
        // @ts-expect-error
        const roomSession: Video.RoomSession = window._roomObj
        await roomSession.updateMedia({
          audio: { enable: true, direction: 'send' },
          video: { enable: false, direction: 'none' },
        })
      })

      await expectStatWithPolling(page, {
        propertyPath: 'outboundRTP.audio.packetsSent',
        matcher: 'toBeGreaterThan',
        expected: 0,
      })
      /**
       * Ideally, the audio packet received should become 0.
       * However, it does not happen but the packets become stabilized.
       */
      await waitForStabilizedStats(page, {
        propertyPath: 'inboundRTP.audio.packetsReceived',
      })
      lastVideoPacketsSent = await waitForStabilizedStats(page, {
        propertyPath: 'outboundRTP.video.packetsSent',
      })
      lastVideoPacketsReceived = await waitForStabilizedStats(page, {
        propertyPath: 'inboundRTP.video.packetsReceived',
      })
    })

    await test.step('it should update media with audio direction "sendrecv"', async () => {
      await page.evaluate(async () => {
        // @ts-expect-error
        const roomSession: Video.RoomSession = window._roomObj
        await roomSession.setAudioDirection('sendrecv')
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
      const stats = await getStats(page)
      expect(stats.outboundRTP.video?.packetsSent).toBe(lastVideoPacketsSent)
      expect(stats.inboundRTP.video?.packetsReceived).toBe(
        lastVideoPacketsReceived
      )
    })

    await test.step('it should update media with audio "recvonly" and video "sendrecv"', async () => {
      await page.evaluate(async () => {
        // @ts-expect-error
        const roomSession: Video.RoomSession = window._roomObj
        await roomSession.updateMedia({
          audio: { enable: false, direction: 'receive' },
          video: { enable: true, direction: 'sendrecv' },
        })
      })

      await waitForStabilizedStats(page, {
        propertyPath: 'outboundRTP.audio.packetsSent',
      })
      await expectStatWithPolling(page, {
        propertyPath: 'inboundRTP.audio.packetsReceived',
        matcher: 'toBeGreaterThan',
        expected: 0,
      })
      await expectStatWithPolling(page, {
        propertyPath: 'outboundRTP.video.packetsSent',
        matcher: 'toBeGreaterThan',
        expected: lastVideoPacketsSent,
      })
      await expectStatWithPolling(page, {
        propertyPath: 'inboundRTP.video.packetsReceived',
        matcher: 'toBeGreaterThan',
        expected: lastVideoPacketsReceived,
      })
    })
  })
})
