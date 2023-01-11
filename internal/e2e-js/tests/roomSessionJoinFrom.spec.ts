import { test, expect } from '@playwright/test'
import type { Video } from '@signalwire/js'
import {
  SERVER_URL,
  createTestRoomSession,
  createOrUpdateRoom,
  deleteRoom,
  randomizeRoomName,
} from '../utils'

interface TestConfig {
  testName: string
  roomName: string
  autoCreateRoom: boolean
  cleanup: boolean
}
test.describe('RoomSession join_from', () => {
  const tests: TestConfig[] = [
    {
      testName: 'static from room config',
      roomName: 'e2e-join-from',
      autoCreateRoom: false,
      cleanup: false,
    },
    {
      testName: 'random room name from room config',
      roomName: randomizeRoomName('e2e-join-from'),
      autoCreateRoom: false,
      cleanup: true,
    },
    {
      testName: 'from VRT',
      roomName: 'e2e-join-from-vrt',
      autoCreateRoom: true,
      cleanup: false,
    },
  ]

  tests.forEach((row) => {
    test(`should not be possible to join a room before the join_from [${row.testName}]`, async ({
      page,
    }) => {
      const buildRoomSession = () => {
        return createTestRoomSession(page, {
          vrt: {
            room_name: row.roomName,
            user_name: 'member',
            auto_create_room: Boolean(row.autoCreateRoom),
            permissions: [],
            join_from: row.autoCreateRoom ? joinFrom : undefined,
          },
          initialEvents: [],
        })
      }
      let roomData: any = {}

      await page.goto(SERVER_URL)

      const delay = 5_000
      const joinFrom = new Date(Date.now() + delay).toISOString()
      if (!row.autoCreateRoom) {
        roomData = await createOrUpdateRoom({
          name: row.roomName,
          join_from: joinFrom,
        })
      }

      await buildRoomSession()

      // --------------- Joining the room and expect an error ---------------
      const joinError: any = await page.evaluate(async () => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj
        const error = await roomObj.join().catch((error) => error)

        return error
      })

      expect(joinError.code).toEqual('403')
      expect(joinError.message).toEqual('Unauthorized')

      await page.waitForTimeout(delay)

      // --------------- Rebuild the room session on the browser ---------------
      await buildRoomSession()

      // --------------- Joining the room ---------------
      const joinParams: any = await page.evaluate(async () => {
        return new Promise((r) => {
          // @ts-expect-error
          const roomObj = window._roomObj
          roomObj.on('room.joined', (params: any) => r(params))
          roomObj.join()
        })
      })

      expect(joinParams.room).toBeDefined()
      expect(joinParams.room_session).toBeDefined()
      expect(
        joinParams.room.members.some(
          (member: any) => member.id === joinParams.member_id
        )
      ).toBeTruthy()
      expect(joinParams.room_session.name).toBe(row.roomName)
      expect(joinParams.room.name).toBe(row.roomName)

      await page.waitForTimeout(3000)

      // --------------- Leaving the room ---------------
      await page.evaluate(() => {
        // @ts-expect-error
        return window._roomObj.leave()
      })

      // Checks that all the elements added by the SDK are gone.
      const targetElementsCount = await page.evaluate(() => {
        return {
          videos: Array.from(document.querySelectorAll('video')).length,
          rootEl: document.getElementById('rootElement')!.childElementCount,
        }
      })
      expect(targetElementsCount.videos).toBe(0)
      expect(targetElementsCount.rootEl).toBe(0)

      if (row.cleanup) {
        await deleteRoom(roomData.id)
      }
    })
  })
})
