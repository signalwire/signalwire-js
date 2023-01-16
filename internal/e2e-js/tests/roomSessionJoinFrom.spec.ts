import { test, expect } from '../fixtures'
import type { Video } from '@signalwire/js'
import {
  SERVER_URL,
  createTestRoomSession,
  createOrUpdateRoom,
  deleteRoom,
  randomizeRoomName,
  expectRoomJoined,
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
      createCustomPage,
    }) => {
      const buildRoomSession = (opts = { expectToJoin: true }) => {
        return createTestRoomSession(page, {
          vrt: {
            room_name: row.roomName,
            user_name: 'member',
            auto_create_room: Boolean(row.autoCreateRoom),
            permissions: [],
            join_from: row.autoCreateRoom ? joinFrom : undefined,
          },
          initialEvents: [],
          expectToJoin: opts.expectToJoin,
        })
      }
      let roomData: any = {}

      const page = await createCustomPage({ name: '[joinFromPage]' })
      await page.goto(SERVER_URL)

      const delay = 10_000
      const joinFrom = new Date(Date.now() + delay).toISOString()
      if (!row.autoCreateRoom) {
        roomData = await createOrUpdateRoom({
          name: row.roomName,
          join_from: joinFrom,
        })
      }

      await buildRoomSession({ expectToJoin: false })

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
      const joinParams: any = await expectRoomJoined(page)

      expect(joinParams.room).toBeDefined()
      expect(joinParams.room_session).toBeDefined()
      expect(
        joinParams.room.members.some(
          (member: any) => member.id === joinParams.member_id
        )
      ).toBeTruthy()
      expect(joinParams.room_session.name).toBe(row.roomName)
      expect(joinParams.room.name).toBe(row.roomName)

      await page.waitForTimeout(1000)

      if (row.cleanup) {
        await deleteRoom(roomData.id)
      }
    })
  })
})
