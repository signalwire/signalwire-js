import { test, expect } from '../fixtures'
import type { Video } from '@signalwire/js'
import {
  SERVER_URL,
  createTestRoomSession,
  expectMCUVisible,
  createRoom,
  createStreamForRoom,
  randomizeRoomName,
  deleteRoom,
  expectRoomJoinWithDefaults,
} from '../utils'

test.describe('Room Session Auto Stream', () => {
  const streamingURL = `${process.env.RTMP_SERVER}${process.env.RTMP_STREAM_NAME}`

  test('should join a room with existing stream', async ({
    createCustomPage,
  }) => {
    const roomName = randomizeRoomName('auto-stream-e2e')

    const connectionSettings = {
      vrt: {
        room_name: roomName,
        user_name: 'e2e_auto-stream',
        auto_create_room: false,
        permissions: ['room.stream'],
      },
      initialEvents: ['stream.started', 'stream.ended'],
    }

    const pageOne = await createCustomPage({ name: '[pageOne]' })
    pageOne.goto(SERVER_URL)

    const roomData = await createRoom({ name: roomName })
    await createStreamForRoom(roomName, streamingURL)

    await createTestRoomSession(pageOne, connectionSettings)
    await expectRoomJoinWithDefaults(pageOne)

    await expectMCUVisible(pageOne)

    let streamsResult = await pageOne.evaluate(() => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj
      return roomObj.getStreams()
    })

    expect(streamsResult.streams).toHaveLength(1)

    await deleteRoom(roomData.id)
  })
})
