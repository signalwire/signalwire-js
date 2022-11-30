import { test, expect } from '@playwright/test'
import {
  SERVER_URL,
  createTestRoomSession,
  enablePageLogs,
  createOrUpdateRoom,
  randomizeRoomName,
  createStreamForRoom,
  deleteRoom,
  tick,
} from '../utils'

test.describe('PVC Room Streaming', () => {
  test('should should stream to preconfigured stream url', async ({
    context,
  }) => {
    const pageOne = await context.newPage()
    const pageTwo = await context.newPage()
    enablePageLogs(pageOne, '[pageOne]')
    enablePageLogs(pageTwo, '[pageTwo]')

    await pageOne.goto(SERVER_URL)

    const room_name = randomizeRoomName('pvc-stream-room')
    const connectionSettings = {
      vrt: {
        room_name,
        user_name: 'pvc-stream-tester',
        auto_create_room: true,
        permissions: ['room.stream'],
      },
      initialEvents: ['stream.started', 'stream.ended'],
    }

    const roomData = await createOrUpdateRoom({
      name: room_name,
    })
    console.log('HERE', roomData)

    const data = await createStreamForRoom(
      room_name,
      process.env.PVC_STREAMING_URL!
    )
    console.log(data)

    await createTestRoomSession(pageOne, connectionSettings)

    // // --------------- Joining from the 1st tab and resolve on 'room.joined' ---------------
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

    // go to twitch channel on pageTwo
    const STREAM_CHECK_URL = process.env.STREAM_CHECK_URL!
    await pageTwo.goto(STREAM_CHECK_URL, { waitUntil: 'networkidle' })
    // Refresh page until it see live indicator
    const result = await new Promise(async (resolve, reject) => {
      for await (let elasped of tick(1000)) {
        console.log(elasped)
        await pageTwo.reload({ waitUntil: 'networkidle' })
        const isLive = await pageTwo
          .locator('span[aria-label="LIVE"]', {
            hasText: 'LIVE',
          })
          .isVisible()
        if (isLive) {
          return resolve(true)
        }
        if (elasped >= 20000) {
          return reject(new Error('Timeout'))
        }
      }
    })

    expect(result).toBe(true)

    // // --------------- Leaving the rooms ---------------
    // @ts-expect-error
    await pageOne.evaluate(() => window._roomObj.leave())

    await deleteRoom(roomData.id)
  })
})
