import { test } from '@playwright/test'
import {
  SERVER_URL,
  createTestRoomSession,
  enablePageLogs,
  createOrUpdateRoom,
  randomizeRoomName,
  createStreamForRoom,
  deleteRoom,
} from '../utils'

test.describe('Room Streaming from REST API', () => {
  test('should start a stream using the REST API', async ({ context }) => {
    const pageOne = await context.newPage()
    const pageTwo = await context.newPage()
    enablePageLogs(pageOne, '[pageOne]')
    enablePageLogs(pageTwo, '[pageTwo]')

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
    await pageOne.evaluate(() => {
      return new Promise((resolve) => {
        // @ts-expect-error
        const roomObj = window._roomObj
        roomObj.on('room.joined', resolve)
        roomObj.join()
      })
    })

    // Checks that the video is visible on pageOne
    await pageOne.waitForSelector('div[id^="sw-sdk-"] > video', {
      timeout: 5000,
    })

    // Visit the stream page on pageTwo to make sure it's working
    const STREAM_CHECK_URL = process.env.STREAM_CHECK_URL!
    await pageTwo.goto(STREAM_CHECK_URL, { waitUntil: 'domcontentloaded' })
    await pageTwo.waitForSelector(`text=${streamName}`, { timeout: 10_000 })

    // --------------- Leaving the room ---------------
    // @ts-expect-error
    await pageOne.evaluate(() => window._roomObj.leave())

    await deleteRoom(roomData.id)
  })
})
