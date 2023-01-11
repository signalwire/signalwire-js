import { test, expect } from '@playwright/test'
import type { Video } from '@signalwire/js'
import {
  SERVER_URL,
  createTestRoomSession,
  createOrUpdateRoom,
  deleteRoom,
  CreateOrUpdateRoomOptions,
  randomizeRoomName,
} from '../utils'

interface TestConfig {
  testName: string
  roomName: string
  roomSettings: Partial<CreateOrUpdateRoomOptions>
  expect(p: any): void
}
test.describe('Room Settings', () => {
  const tests: TestConfig[] = [
    {
      testName: 'should set the initial layout',
      roomName: randomizeRoomName('e2e-layout'),
      roomSettings: {
        layout: '10x10',
      },
      expect: (joinParams) => {
        expect(joinParams.room_session.layout_name).toEqual('10x10')
        expect(joinParams.room.layout_name).toEqual('10x10')
      },
    },
    {
      testName: 'should set auto-record and start recording',
      roomName: randomizeRoomName('e2e-auto-record'),
      roomSettings: {
        record_on_start: true,
      },
      expect: (joinParams) => {
        expect(joinParams.room_session.recording).toEqual(true)
        expect(joinParams.room.recording).toEqual(true)
      },
    },
  ]

  tests.forEach((row) => {
    test(row.testName, async ({ page }) => {
      await page.goto(SERVER_URL)

      const roomData = await createOrUpdateRoom({
        name: row.roomName,
        ...row.roomSettings,
      })

      await createTestRoomSession(page, {
        vrt: {
          room_name: row.roomName,
          user_name: 'member',
          auto_create_room: false,
          permissions: [],
        },
        initialEvents: [],
      })

      // --------------- Joining the room ---------------
      const joinParams: any = await page.evaluate(async () => {
        return new Promise((resolve) => {
          // @ts-expect-error
          const roomObj: Video.RoomSession = window._roomObj
          roomObj.on('room.joined', resolve)
          roomObj.join()
        })
      })

      // Run custom expectations for each run
      row.expect(joinParams)

      // --------------- Leaving the rooms ---------------
      // @ts-expect-error
      await page.evaluate(() => window._roomObj.leave())

      // Checks that all the elements added by the SDK are gone.
      const targetElementsCount = await page.evaluate(() => {
        return {
          videos: Array.from(document.querySelectorAll('video')).length,
          rootEl: document.getElementById('rootElement')!.childElementCount,
        }
      })
      expect(targetElementsCount.videos).toBe(0)
      expect(targetElementsCount.rootEl).toBe(0)

      await deleteRoom(roomData.id)
    })
  })
})
