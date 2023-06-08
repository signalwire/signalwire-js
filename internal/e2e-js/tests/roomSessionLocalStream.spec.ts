import { test, expect } from '../fixtures'
import type { Video } from '@signalwire/js'
import {
  SERVER_URL,
  createTestRoomSession,
  expectRoomJoined,
  randomizeRoomName,
  createTestVRTToken,
  expectMCUVisibleForAudience,
} from '../utils'

test.describe('RoomSession with custom local stream', () => {
  test('should start the room with user stream', async ({
    createCustomPage,
  }) => {
    const page = await createCustomPage({ name: '[pageCustomStream]' })
    await page.goto(SERVER_URL)

    const vrt = await createTestVRTToken({
      room_name: randomizeRoomName('room_session'),
      user_name: 'e2e_test_custom_stream',
      auto_create_room: true,
      permissions: [],
    })
    if (!vrt) {
      console.error('Invalid VRT. Exiting..')
      process.exit(4)
    }
    const beforeJoin = await page.evaluate(
      async (options) => {
        // @ts-expect-error
        const Video = window._SWJS.Video

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        })

        const roomSession = new Video.RoomSession({
          host: options.RELAY_HOST,
          token: options.API_TOKEN,
          rootElement: document.getElementById('rootElement'),
          logLevel: 'debug',
          debug: {
            logWsTraffic: true,
          },
          localStream: stream,
        })

        // @ts-expect-error
        window._roomObj = roomSession

        return {
          id: stream.id,
          trackIds: stream.getTracks().map((t) => t.id),
        }
      },
      {
        RELAY_HOST: process.env.RELAY_HOST,
        API_TOKEN: vrt,
      }
    )

    // Join the room and expect the MCU (without local overlay) to be visible
    await expectRoomJoined(page)
    await expectMCUVisibleForAudience(page)

    const afterJoin = await page.evaluate(async () => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj
      const stream = roomObj.localStream
      return {
        id: stream?.id,
        trackIds: stream?.getTracks().map((t) => t.id),
      }
    })

    // Make sure streamId and trackIds are equal before/after join
    expect(beforeJoin).toStrictEqual(afterJoin)
  })

  test('should set the stream on the fly', async ({ createCustomPage }) => {
    const page = await createCustomPage({ name: '[pageCustomStreamFly]' })
    await page.goto(SERVER_URL)

    const connectionSettings = {
      vrt: {
        room_name: randomizeRoomName('room_session'),
        user_name: 'e2e_test_custom_stream_fly',
        auto_create_room: true,
        permissions: [],
      },
    }

    await createTestRoomSession(page, connectionSettings)
    await expectRoomJoined(page)
    await expectMCUVisibleForAudience(page)

    const before = await page.evaluate(async () => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj
      const stream = roomObj.localStream
      return {
        id: stream?.id,
        trackIds: stream?.getTracks().map((t) => t.id),
      }
    })

    const after = await page.evaluate(async () => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj

      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      })

      // Set newStream
      await roomObj.setLocalStream(newStream)
      const stream = roomObj.localStream

      return {
        id: stream?.id,
        trackIds: stream?.getTracks().map((t) => t.id),
      }
    })

    expect(before.id).toBe(after.id)
    expect(before.trackIds).toHaveLength(2)
    expect(after.trackIds).toHaveLength(2)
    after.trackIds?.forEach((trackId) => {
      expect(before.trackIds).not.toContainEqual(trackId)
    })
  })
})
