import { test, expect } from '@playwright/test'
import type { Video } from '@signalwire/js'
import {
  SERVER_URL,
  createTestRoomSession,
  createTestRoomSessionWithJWT,
  enablePageLogs,
  randomizeRoomName,
} from '../utils'

test.describe('RoomSessionReattachBadAuth', () => {
  test('join a room, reattach with invalid authorization_state and then leave the room',
  async ({
    page,
  }) => {
    await page.goto(SERVER_URL)
    enablePageLogs(page)

    const roomName = randomizeRoomName()
    const permissions: any = []
    const connectionSettings = {
      vrt: {
        room_name: roomName,
        user_name: 'e2e_reattach_test_bad_auth',
        auto_create_room: true,
        permissions,
      },
      initialEvents: [],
      roomSessionOptions: {
        _hijack: true,
        logLevel: 'warn',
        // debug: {
        //   logWsTraffic: true,
        // },
      },
    }
    await createTestRoomSession(page, connectionSettings)

    // --------------- Joining the room ---------------
    const joinParams: any = await page.evaluate(() => {
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
    expect(joinParams.room_session.name).toBe(roomName)
    expect(joinParams.room.name).toBe(roomName)

    // Checks that the video is visible
    await page.waitForSelector('div[id^="sw-sdk-"] > video', { timeout: 5000 })

    const roomPermissions: any = await page.evaluate(() => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj
      return roomObj.permissions
    })
    expect(roomPermissions).toStrictEqual(permissions)
    const room_name = joinParams.room_session.name
    expect(room_name).toBeDefined()

    const jwtToken: string = await page.evaluate(() => {
      // @ts-expect-error
      return window.jwt_token
    })


    // --------------- Reattaching ---------------
    await page.reload()

    await createTestRoomSessionWithJWT(page, connectionSettings, jwtToken)

    // Join again but with a bogus authorization_state
    const joinResponse: any = await page.evaluate(async (room_name) => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj

      // Inject wrong values for authorization state
      const key = "as-" + room_name + "-member"
      const state = btoa("just wrong")
      window.sessionStorage.setItem(key, state)
      console.log("Injected authorization state for " + key + " with value " + state)

      // Now try to reattach, which should not succeed
      return roomObj.join()
        .then(() => true)
        .catch(() => false)
    }, room_name)

    expect(joinResponse).toBe(false)

    // Checks that all the elements added by the SDK are gone.
    const targetElementsCount = await page.evaluate(() => {
      return {
        videos: Array.from(document.querySelectorAll('video')).length,
        rootEl: document.getElementById('rootElement')!.childElementCount,
      }
    })
    expect(targetElementsCount.videos).toBe(0)
    expect(targetElementsCount.rootEl).toBe(0)
  })
})
