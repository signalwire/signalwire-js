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
  test('audience should join a room, reattach and then leave the room',
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
        user_name: 'e2e_reattach_audience_test',
        auto_create_room: true,
        join_as: 'audience' as const,
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

    // --------------- Join the room as audience ---------------
    const joinParams: any = await page.evaluate(() => {
      return new Promise((r) => {
        // @ts-expect-error
        const roomObj = window._roomObj
        roomObj.on('room.joined', (params: any) => r(params))
        roomObj.join()
      })
    })

    expect(joinParams.room).toBeDefined()

    // --------------- Make sure on page we have a audience ---------------
    await expectInteractivityMode(page, 'audience')

    // --------------- Check SDP/RTCPeer on audience (recvonly for audience) 
    await expectSDPDirection(page, 'recvonly', true)

    // --------------- Check that the video is visible on page
    await page.waitForSelector('#rootElement video', {
      timeout: 10000,
    })

    // --------------- Reattach ---------------
    await page.reload()

    await createTestRoomSession(page, connectionSettings)

    const reattachParams: any = await page.evaluate(() => {
      return new Promise((r) => {
        // @ts-expect-error
        const roomObj = window._roomObj
        roomObj.on('room.joined', (params: any) => r(params))
        roomObj.join()
      })
    })

    expect(reattachParams.room).toBeDefined()
    expect(reattachParams.room_session).toBeDefined()
    expect(reattachParams.room_session.id).toEqual(joinParams.room_session.id)
    expect(reattachParams.call_id).toBeDefined()
    expect(reattachParams.call_id).toEqual(joinParams.call_id)
    expect(reattachParams.member_id).toBeDefined()
    expect(reattachParams.member_id).toEqual(joinParams.member_id)

    // --------------- Make sure on page we have a audience ---------------
    await expectInteractivityMode(page, 'audience')

    // --------------- Check SDP/RTCPeer on audience (recvonly for audience)
    await expectSDPDirection(page, 'recvonly', true)

    // --------------- Check that the video is visible on page
    await page.waitForSelector('#rootElement video', {
      timeout: 10000,
    })
    // --------------- DONE -------------------------

    // --------------- Leave the room ---------------
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
