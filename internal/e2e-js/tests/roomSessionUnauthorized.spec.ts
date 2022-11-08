import { test, expect } from '@playwright/test'
import type { Video } from '@signalwire/js'
import { createTestServer, createTestRoomSession } from '../utils'

test.describe('RoomSession unauthorized methods for audience', () => {
  let server: any = null

  test.beforeAll(async () => {
    server = await createTestServer()
    await server.start()
  })

  test.afterAll(async () => {
    await server.close()
  })

  test('should handle joining a room, try to perform unauthorized actions and then leave the room', async ({
    page,
  }) => {
    await page.goto(server.url)

    page.on('console', (log) => {
      console.log(log)
    })

    const roomName = 'e2e-room-one'
    const audience_permissions: string[] = []

    await createTestRoomSession(page, {
      vrt: {
        room_name: roomName,
        user_name: 'e2e_test',
        join_as: 'audience' as const,
        auto_create_room: true,
        permissions: audience_permissions,
      },
      initialEvents: [
        'member.joined',
        'member.left',
        'member.updated',
        'playback.ended',
        'playback.started',
        'playback.updated',
        'recording.ended',
        'recording.started',
        'room.updated',
      ],
    })

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
    expect(joinParams.room.name).toBe(roomName)

    // Checks that the video is visible, as audience
    await page.waitForSelector('#rootElement video', {
      timeout: 10000,
    })

    const roomPermissions: any = await page.evaluate(() => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj
      return roomObj.permissions
    })
    expect(roomPermissions).toStrictEqual(audience_permissions)

    // --------------- Unmuting Audio (self) and expecting 403 ---------------
    const errorCode: any = await page.evaluate(async () => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj
      const error = await roomObj.audioUnmute().catch((error) => error);
      console.log('audioUnmute error', error.jsonrpc.code, error.jsonrpc.message);
      return error.jsonrpc.code;
    })
    expect(errorCode).toBe("403");

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
