import { test, expect } from '../fixtures'
import type { VideoRoomSession } from '@signalwire/js'
import {
  SERVER_URL,
  createTestRoomSession,
  createOrUpdateRoom,
  deleteRoom,
  randomizeRoomName,
  expectPageEvalToPass,
} from '../utils'

interface TestConfig {
  testName: string
  roomName: string
  autoCreateRoom: boolean
  cleanup: boolean
}
test.describe('RoomSession join_until', () => {
  const tests: TestConfig[] = [
    {
      testName: 'static from room config',
      roomName: 'e2e-join-until',
      autoCreateRoom: false,
      cleanup: false,
    },
    {
      testName: 'random room name from room config',
      roomName: randomizeRoomName('e2e-join-until'),
      autoCreateRoom: false,
      cleanup: true,
    },
    {
      testName: 'from VRT',
      roomName: 'e2e-join-until-vrt',
      autoCreateRoom: true,
      cleanup: false,
    },
  ]

  tests.forEach((row) => {
    test(`should not be possible to join a room after the join_until [${row.testName}]`, async ({
      createCustomPage,
    }) => {
      let roomData: any = {}

      const page = await createCustomPage({ name: '[joinUntilPage]' })
      await page.goto(SERVER_URL)

      const delay = 5_000
      const joinUntil = new Date(Date.now() + delay).toISOString()
      if (!row.autoCreateRoom) {
        roomData = await createOrUpdateRoom({
          name: row.roomName,
          join_until: joinUntil,
        })
      }

      await createTestRoomSession(page, {
        vrt: {
          room_name: row.roomName,
          user_name: 'member',
          auto_create_room: Boolean(row.autoCreateRoom),
          permissions: [],
          join_until: row.autoCreateRoom ? joinUntil : undefined,
        },
        initialEvents: [],
      })

      await page.waitForTimeout(delay)

      // --------------- Joining the room ---------------
      const joinError = await expectPageEvalToPass(page, {
        evaluateFn: async () => {
          const roomObj = window._roomObj as VideoRoomSession
          const error = await roomObj.join().catch((error) => error)
          return error
        },
        assertionFn: (error) => {
          expect(error).toBeDefined()
        },
        message: 'Expected join to fail after join_until',
      })

      expect(joinError.code).toEqual('403')
      expect(joinError.message).toEqual('Unauthorized')

      // Checks that all the elements added by the SDK are not there.
      const targetElementsCount = await expectPageEvalToPass(page, {
        evaluateFn: () => {
          return {
            videos: Array.from(document.querySelectorAll('video')).length,
            rootEl: document.getElementById('rootElement')!.childElementCount,
          }
        },
        assertionFn: (res) => expect(res).toBeDefined(),
        message: 'Expected no SDK elements in DOM after denied join',
      })
      expect(targetElementsCount.videos).toBe(0)
      expect(targetElementsCount.rootEl).toBe(0)

      if (row.cleanup) {
        await deleteRoom(roomData.id)
      }
    })
  })
})
