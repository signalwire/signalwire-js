import { test, expect, Page } from '@playwright/test'
import type { Video } from '@signalwire/js'
import { createTestServer, createTestRoomSession } from '../utils'

test.describe('RoomSession promote method', () => {
  let server: any = null

  test.beforeAll(async () => {
    server = await createTestServer()
    await server.start()
  })

  test.afterAll(async () => {
    await server.close()
  })

  test('should not be able to promote participant', async ({ context }) => {
    const pageOne = await context.newPage()

    pageOne.on('console', (log) => console.log('[pageOne]', log))

    await pageOne.goto(server.url)

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

    const expectInteractivityMode = async (
      page: Page,
      mode: 'member' | 'audience'
    ) => {
      const interactivityMode = await page.evaluate(async () => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj
        return roomObj.interactivityMode
      })

      expect(interactivityMode).toEqual(mode)
    }

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
      console.log(
        'audioUnmute error',
        error.jsonrpc.code,
        error.jsonrpc.message
      )
      return error.jsonrpc.code
    })

    expect(errorCode).toBe('403')

    // --------------- Leaving the rooms ---------------
    // @ts-expect-error
    await pageOne.evaluate(() => window._roomObj.leave())
  })
})
