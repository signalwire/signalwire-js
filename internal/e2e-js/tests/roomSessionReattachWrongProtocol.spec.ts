import { test, expect } from '@playwright/test'
import type { Video } from '@signalwire/js'
import { EventEmitter } from 'eventemitter3'
import {
  SERVER_URL,
  createTestRoomSession,
  enablePageLogs,
  randomizeRoomName,
} from '../utils'

test.describe('RoomSessionReattachWrongProtocol', () => {
  test('should handle joining a room, reattaching with wrong protocol ID and then leaving the room', async ({
    page,
  }) => {
    await page.goto(SERVER_URL)
    enablePageLogs(page)

    const roomName = randomizeRoomName()
    const permissions: any = []
    const connectionSettings = {
      vrt: {
        room_name: roomName,
        user_name: 'e2e_reattach_test_wrong_protocol',
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

    // --------------- Reattaching ---------------
    await page.reload()

    await createTestRoomSession(page, connectionSettings)

    // Try to join but expect it to fail due to wrong Protocol
    await page.evaluate((room_name) => {
      console.log("Joining room " + room_name)
      return new Promise((resolve, reject) => {
        // @ts-expect-error
        const roomObj = window._roomObj
        roomObj.on('room.joined', () => {
          clearTimeout(to)
          reject(" room.joined should not have happened")
        })

        let to = setTimeout(() => {
          roomObj.off('room.joined', reject)
          resolve(" room.joined didn't happen within a reasonable time")
        }, 5000)

        // Inject wrong values for protocol ID
        const key = "pt-" + room_name + "-member"
        const state = btoa("wrong protocol")
        window.sessionStorage.setItem(key, state)
        console.log("Injected protocol ID for " + key + " with value " + state)

        roomObj.join()
      })
    }, room_name)

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
