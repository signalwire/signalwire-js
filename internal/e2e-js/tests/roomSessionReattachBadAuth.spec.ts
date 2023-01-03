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
  test('should handle joining a room, reattaching with bogus authorization_state and then leaving the room', async ({
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
        logLevel: 'debug',
        debug: {
          logWsTraffic: true,
        },
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

    // Join again
    const reattachParams: any = await page.evaluate((room_name) => {
      console.log("Joining room " + room_name)
      return new Promise((r) => {
        // @ts-expect-error
        const roomObj = window._roomObj
        roomObj.on('room.joined', (params: any) => r(params))

        // Inject wrong values for authorization_state
        const key = "as-" + room_name + "-member"
        const state = btoa("bogus")
        window.sessionStorage.setItem(key, state)
        console.log("Injected bogus authorization_state for " + key + " with value " + state)

        roomObj.join()
      })
    }, room_name)

    expect(reattachParams.room).toBeDefined()
    expect(reattachParams.room_session).toBeDefined()
    expect(
      reattachParams.room.members.some(
        (member: any) => member.id === reattachParams.member_id
      )
    ).toBeTruthy()
    expect(reattachParams.room_session.name).toBe(roomName)
    expect(reattachParams.room.name).toBe(roomName)

    // The member id must be different because the reattach failed
    expect(reattachParams.member_id).not.toBe(joinParams.member_id)

    // Checks that the video is visible
    await page.waitForSelector('div[id^="sw-sdk-"] > video', { timeout: 5000 })

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
  })
})
