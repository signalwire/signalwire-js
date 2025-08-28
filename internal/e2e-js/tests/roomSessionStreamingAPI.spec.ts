import { test, expect } from '../fixtures'
import {
  SERVER_URL,
  createTestRoomSession,
  createRoom,
  randomizeRoomName,
  createStreamForRoom,
  deleteRoom,
  expectMCUVisible,
  expectRoomJoinedEvent,
  joinRoom,
  expectToPass,
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

    const roomData = await createRoom({
      name: room_name,
    })

    const streamName = randomizeRoomName(process.env.RTMP_STREAM_NAME!)
    await createStreamForRoom(
      room_name,
      `${process.env.RTMP_SERVER}${streamName}`
    )

    // Create and join room from the 1st tab and resolve on 'room.joined'
    await createTestRoomSession(pageOne, connectionSettings)
    const pageOneJoinedPromise = expectRoomJoinedEvent(pageOne, {
      message: 'Waiting for room.joined (streaming api)',
    })
    await joinRoom(pageOne, { message: 'Joining room (streaming api)' })
    await pageOneJoinedPromise

    // Checks that the video is visible on pageOne
    await expectMCUVisible(pageOne)

    // Visit the stream page on pageTwo to make sure it's working
    const STREAM_CHECK_URL = process.env.STREAM_CHECK_URL!
    await pageTwo.goto(STREAM_CHECK_URL, { waitUntil: 'domcontentloaded' })

    await expectToPass(
      async () => {
        const locator = pageTwo.getByText(streamName)
        await pageTwo.reload({ waitUntil: 'domcontentloaded' })
        await expect(locator).toBeVisible({ timeout: 30_000 })
      },
      { message: 'Stream is not visible' },
      { timeout: 30_000, interval: [500] }
    )

    await deleteRoom(roomData.id)
  })
})
