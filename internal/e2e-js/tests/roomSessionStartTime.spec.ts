import type { Video } from '@signalwire/js'
import { test, expect } from '../fixtures'
import { SERVER_URL, createTestRoomSession, randomizeRoomName } from '../utils'

const MAX_CALL_SETUP_TIME_MS = 4000

test.describe('RoomSession Start Time', () => {
  test('should join a room room within 4 seconds', async ({
    createCustomPage,
  }) => {
    const page = await createCustomPage({ name: 'raise-lower' })
    await page.goto(SERVER_URL)

    const roomName = randomizeRoomName('raise-lower-e2e')
    const memberSettings = {
      vrt: {
        room_name: roomName,
        user_name: 'e2e_participant_meta',
        auto_create_room: true,
        permissions: ['room.prioritize_handraise'],
      },
      initialEvents: ['room.updated'],
    }

    await createTestRoomSession(page, memberSettings)

    // --------------- Joining the room ---------------
    const ms = await page.evaluate(() => {
      return new Promise<number>(async (resolve, reject) => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj

        roomObj.once('room.joined', () => {
          console.log('Room joined!')
          resolve(performance.now() - t0)
        })

        const t0 = performance.now()
        await roomObj.join().catch(reject)
      })
    })

    console.log('::group::CallFabric perf')
    console.log(`[PERF] call.start(ms)= ${ms.toFixed(0)}`)
    console.log(`::notice title=Call setup latency::${Math.round(ms)} ms`)
    console.log('::endgroup::')

    expect(ms).toBeLessThan(MAX_CALL_SETUP_TIME_MS)
  })
})
