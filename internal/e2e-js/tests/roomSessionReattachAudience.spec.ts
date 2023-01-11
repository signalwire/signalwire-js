import { test, expect } from '@playwright/test'
import {
  SERVER_URL,
  createTestRoomSession,
  enablePageLogs,
  randomizeRoomName,
  expectSDPDirection,
  expectInteractivityMode,
} from '../utils'

test.describe('RoomSessionReattachAudience', () => {
  test('should handle joining a room, reattaching and then leaving the room, for audience', async ({
    page,
  }) => {
    await page.goto(SERVER_URL)
    enablePageLogs(page)

    const roomName = randomizeRoomName()
    const permissions: any = []
    const connectionSettings = {
      vrt: {
        room_name: roomName,
        user_name: 'e2e_reattach_audience_test',
        auto_create_room: true,
        join_as: 'audience' as const,
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

    // --------------- Joining the room as audience ---------------
    const joinParams: any = await page.evaluate(() => {
      return new Promise((r) => {
        // @ts-expect-error
        const roomObj = window._roomObj
        roomObj.on('room.joined', (params: any) => r(params))
        roomObj.join()
      })
    })

    console.log("----------- joinParams: ", joinParams)
    expect(joinParams.room).toBeDefined()

    // --------------- Make sure on page we have a audience ---------------
    await expectInteractivityMode(page, 'audience')

    // --------------- Check SDP/RTCPeer on audience (recvonly since audience) ---------------
    await expectSDPDirection(page, 'recvonly', true)

    // Checks that the video is visible on page
    await page.waitForSelector('#rootElement video', {
      timeout: 10000,
    })

    // --------------- Reattaching ---------------
    await page.reload()

    console.log("Page reloaded, reattaching")
    await createTestRoomSession(page, connectionSettings)

    const reattachParams: any = await page.evaluate(() => {
      return new Promise((r) => {
        // @ts-expect-error
        const roomObj = window._roomObj
        roomObj.on('room.joined', (params: any) => r(params))
        roomObj.join()
      })
    })

    console.log("----------- reattachParams: ", reattachParams)
    expect(reattachParams.room).toBeDefined()



    // --------------- Make sure on page we have a audience ---------------
    await expectInteractivityMode(page, 'audience')

    // --------------- Check SDP/RTCPeer on audience (recvonly since audience) ---------------
    await expectSDPDirection(page, 'recvonly', true)

    // Checks that the video is visible on page
    await page.waitForSelector('#rootElement video', {
      timeout: 10000,
    })

// TODO: Check the call ID and member ID haven't changed

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
