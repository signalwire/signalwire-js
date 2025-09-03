import { Video } from '@signalwire/js'
import { Page, test, expect } from '../fixtures'
import {
  createTestRoomSession,
  expectMCUVisible,
  expectRoomJoinedEvent,
  joinRoom,
  expectStatWithPolling,
  getStats,
  randomizeRoomName,
  SERVER_URL,
  waitForStabilizedStats,
  expectPageEvalToPass,
} from '../utils'

test.describe('RoomSession Update Media', () => {
  const setupAndJoinRoom = async (page: Page) => {
    const roomName = randomizeRoomName('e2e-room-update-media')
    const memberSettings = {
      vrt: {
        room_name: roomName,
        user_name: 'e2e_participant_meta',
        auto_create_room: true,
      },
    }

    await createTestRoomSession(page, memberSettings)

    // --------------- Joining the room ---------------
    const joinedPromise = expectRoomJoinedEvent(page)
    await joinRoom(page)
    const joinParams = await joinedPromise
    expect(joinParams.room).toBeDefined()
    expect(joinParams.room_session).toBeDefined()

    // Wait for the video to be visible
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

    await test.step('it should update media with audio "inactive" and video "sendonly"', async () => {
      await expectPageEvalToPass(page, {
        evaluateFn: async () => {
          const roomSession = window._roomObj as Video.RoomSession
          await roomSession.updateMedia({
            audio: { direction: 'inactive' },
            video: { direction: 'sendonly' },
          })
          return true
        },
        assertionFn: (ok) => expect(ok).toBe(true),
        message: 'Expected updateMedia to apply directions (inactive/sendonly)',
        timeout: 30_000,
        intervals: [30_000],
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
      await expectPageEvalToPass(page, {
        evaluateFn: async () => {
          const roomSession = window._roomObj as Video.RoomSession
          await roomSession.setVideoDirection('sendrecv')
          return true
        },
        assertionFn: (ok) => expect(ok).toBe(true),
        message: 'Expected setVideoDirection to apply sendrecv',
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

    await test.step('it should update media with audio "sendrecv" and video "recvonly"', async () => {
      await expectPageEvalToPass(page, {
        evaluateFn: async () => {
          const roomSession = window._roomObj as Video.RoomSession
          await roomSession.updateMedia({
            audio: { direction: 'sendrecv' },
            video: { direction: 'recvonly' },
          })
          return true
        },
        assertionFn: (ok) => expect(ok).toBe(true),
        message: 'Expected updateMedia to apply directions (sendrecv/recvonly)',
        timeout: 30_000,
        intervals: [30_000],
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

    await test.step('it should update media with audio "sendonly" and video "inactive"', async () => {
      await expectPageEvalToPass(page, {
        evaluateFn: async () => {
          const roomSession = window._roomObj as Video.RoomSession
          await roomSession.updateMedia({
            audio: { direction: 'sendonly' },
            video: { direction: 'inactive' },
          })
          return true
        },
        assertionFn: (ok) => expect(ok).toBe(true),
        message: 'Expected updateMedia to apply directions (sendonly/inactive)',
        timeout: 30_000,
        intervals: [30_000],
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
      await expectPageEvalToPass(page, {
        evaluateFn: async () => {
          const roomSession = window._roomObj as Video.RoomSession
          await roomSession.setAudioDirection('sendrecv')
          return true
        },
        assertionFn: (ok) => expect(ok).toBe(true),
        message: 'Expected setAudioDirection to apply sendrecv',
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
      await expectPageEvalToPass(page, {
        evaluateFn: async () => {
          const roomSession = window._roomObj as Video.RoomSession
          await roomSession.updateMedia({
            audio: { direction: 'recvonly' },
            video: { direction: 'sendrecv' },
          })
          return true
        },
        assertionFn: (ok) => expect(ok).toBe(true),
        message: 'Expected updateMedia to apply directions (recvonly/sendrecv)',
        timeout: 30_000,
        intervals: [30_000],
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
