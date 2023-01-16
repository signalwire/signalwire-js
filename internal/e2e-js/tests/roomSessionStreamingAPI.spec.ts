import { test } from '../fixtures'
import {
  SERVER_URL,
  createTestRoomSession,
  createOrUpdateRoom,
  randomizeRoomName,
  createStreamForRoom,
  deleteRoom,
  expectRoomJoined,
  expectMCUVisible,
} from '../utils'

test.describe('Room Streaming from REST API', () => {
  test('should start a stream using the REST API', async ({
    createCustomPage,
  }) => {
    const pageOne = await createCustomPage({ name: '[pageOne]' })
    const pageTwo = await createCustomPage({ name: '[pageTwo]' })

    await pageOne.goto(SERVER_URL)

    const room_name = randomizeRoomName('stream-room-api')
    const connectionSettings = {
      vrt: {
        room_name,
        user_name: 'stream-tester',
        auto_create_room: true,
        permissions: ['room.stream'],
      },
      initialEvents: ['stream.started', 'stream.ended'],
    }

    const roomData = await createOrUpdateRoom({
      name: room_name,
    })

    const streamName = randomizeRoomName(process.env.RTMP_STREAM_NAME!)
    await createStreamForRoom(
      room_name,
      `${process.env.RTMP_SERVER}${streamName}`
    )

    await createTestRoomSession(pageOne, connectionSettings)

    // --------------- Joining from the 1st tab and resolve on 'room.joined' ---------------
    await expectRoomJoined(pageOne)

    // Checks that the video is visible on pageOne
    await expectMCUVisible(pageOne)

    // Visit the stream page on pageTwo to make sure it's working
    const STREAM_CHECK_URL = process.env.STREAM_CHECK_URL!
    await pageTwo.goto(STREAM_CHECK_URL, { waitUntil: 'domcontentloaded' })
    await pageTwo.waitForSelector(`text=${streamName}`, { timeout: 10_000 })

    await deleteRoom(roomData.id)
  })
})
