import { test, expect } from '@playwright/test'
import type { Video } from '@signalwire/js'
import {
  createTestRoomSession,
  enablePageLogs,
  expectInteractivityMode,
  SERVER_URL,
} from '../utils'

test.describe('RoomSession promote method', () => {
  test('should not be able to promote participant', async ({ context }) => {
    const pageOne = await context.newPage()
    enablePageLogs(pageOne, '[pageOne]')

    await pageOne.goto(SERVER_URL)

    const memberSettings = {
      vrt: {
        room_name: 'promotion-room',
        user_name: 'e2e_member',
        auto_create_room: true,
        permissions: ['room.member.demote', 'room.member.promote'],
      },
      initialEvents: ['member.joined', 'member.updated', 'member.left'],
    }

    await createTestRoomSession(pageOne, memberSettings)

    // --------------- Joining from the 1st tab as member and resolve on 'room.joined' ---------------
    await pageOne.evaluate(() => {
      return new Promise((resolve) => {
        // @ts-expect-error
        const roomObj = window._roomObj
        roomObj.on('room.joined', resolve)
        roomObj.join()
      })
    })

    // --------------- Make sure on pageOne we have a member ---------------
    await expectInteractivityMode(pageOne, 'member')

    // Checks that the video is visible on pageOne
    await pageOne.waitForSelector('div[id^="sw-sdk-"] > video', {
      timeout: 5000,
    })

    await pageOne.waitForTimeout(2000)

    // --------------- Promote participant from pageOne and resolve on error ---------------
    const errorCode: any = await pageOne.evaluate(async () => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj

      const error = await roomObj
        .promote({
          memberId: roomObj.memberId,
          permissions: ['room.member.promote', 'room.member.demote'],
        })
        .catch((error) => error)
      console.log('promote error', error.jsonrpc.code, error.jsonrpc.message)
      return error.jsonrpc.code
    })

    expect(errorCode).toBe('403')

    // --------------- Leaving the rooms ---------------
    // @ts-expect-error
    await pageOne.evaluate(() => window._roomObj.leave())
  })
})
