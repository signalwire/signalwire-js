import { test, expect } from '../fixtures'
import type { Video } from '@signalwire/js'
import {
  SERVER_URL,
  createTestRoomSession,
  randomizeRoomName,
  createTestVRTToken,
  expectMCUVisibleForAudience,
  expectRoomJoinedEvent,
  joinRoom,
  expectPageEvalToPass,
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

    const beforeJoin = await expectPageEvalToPass(page, {
      evaluateArgs: {
        RELAY_HOST: process.env.RELAY_HOST,
        API_TOKEN: vrt,
      },
      evaluateFn: async (options) => {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        })

        // @ts-expect-error
        const Video = window._SWJS.Video
        const roomSession = new Video.RoomSession({
          host: options.RELAY_HOST,
          token: options.API_TOKEN,
          rootElement: document.getElementById('rootElement')!,
          logLevel: 'debug',
          debug: {
            logWsTraffic: true,
          },
          localStream: stream,
        })

        window._roomObj = roomSession

        return {
          id: stream.id,
          trackIds: stream.getTracks().map((t) => t.id),
        }
      },
      assertionFn: (res) => expect(res).toBeDefined(),
      message: 'Expected to create room with custom local stream',
    })

    // Join the room and expect the MCU (without local overlay) to be visible
    const joinPromise = expectRoomJoinedEvent(page)
    await joinRoom(page)
    await joinPromise
    await expectMCUVisibleForAudience(page)

    const afterJoin = await expectPageEvalToPass(page, {
      evaluateFn: () => {
        const roomObj = window._roomObj as Video.RoomSession
        const stream = roomObj.localStream
        return {
          id: stream?.id,
          trackIds: stream?.getTracks().map((t: MediaStreamTrack) => t.id),
        }
      },
      assertionFn: (res) => expect(res).toBeDefined(),
      message: 'Expected to read local stream after join',
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
    const joinedPromise = expectRoomJoinedEvent(page, {
      message: 'Waiting for room.joined with custom stream',
    })
    await joinRoom(page, { message: 'Joining room with custom stream' })
    await joinedPromise

    await expectMCUVisibleForAudience(page)

    const before = await expectPageEvalToPass(page, {
      evaluateFn: () => {
        const roomObj = window._roomObj as Video.RoomSession
        const stream = roomObj.localStream
        return {
          id: stream?.id,
          trackIds: stream?.getTracks().map((t: MediaStreamTrack) => t.id),
        }
      },
      assertionFn: (res) => expect(res).toBeDefined(),
      message: 'Expected to read local stream before setLocalStream',
    })

    const after = await expectPageEvalToPass(page, {
      evaluateFn: async () => {
        const roomObj = window._roomObj as Video.RoomSession

        const newStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        })

        // Set newStream
        await roomObj.setLocalStream(newStream)
        const stream = roomObj.localStream

        return {
          id: stream?.id,
          trackIds: stream?.getTracks().map((t: MediaStreamTrack) => t.id),
        }
      },
      assertionFn: (res) => expect(res).toBeDefined(),
      message: 'Expected to set and read new local stream',
    })

    expect(before.id).toBe(after.id)
    expect(before.trackIds).toHaveLength(2)
    expect(after.trackIds).toHaveLength(2)
    after.trackIds?.forEach((trackId) => {
      expect(before.trackIds).not.toContainEqual(trackId)
    })
  })
})
