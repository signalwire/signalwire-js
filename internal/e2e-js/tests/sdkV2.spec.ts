import { test, expect } from '../fixtures'
import {
  SERVER_URL,
  // createTestRoomSession,
  // randomizeRoomName,
  // expectRoomJoined,
  // expectMCUVisibleForAudience,
} from '../utils'

test.describe('SDK V2', () => {
  test('should make outbound calls', async ({ createCustomPage }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(`${SERVER_URL}/index-v2.html`)

    const h1 = page.locator('h1')
    expect(await h1.innerText()).toBe('Hello im v2!')
    await page.waitForTimeout(10_000)

    // const roomName = randomizeRoomName('e2e-403')
    // const audiencePermissions: string[] = []

    // await createTestRoomSession(page, {
    //   vrt: {
    //     room_name: roomName,
    //     user_name: 'e2e_test_403',
    //     join_as: 'audience' as const,
    //     auto_create_room: true,
    //     permissions: audiencePermissions,
    //   },
    //   initialEvents: [
    //     'member.joined',
    //     'member.left',
    //     'member.updated',
    //     'playback.ended',
    //     'playback.started',
    //     'playback.updated',
    //     'recording.ended',
    //     'recording.started',
    //     'room.updated',
    //   ],
    // })

    // // --------------- Joining the room ---------------
    // const joinParams = await expectRoomJoined(page)

    // expect(joinParams.room).toBeDefined()
    // expect(joinParams.room_session).toBeDefined()
    // expect(joinParams.room.name).toBe(roomName)

    // // Checks that the video is visible, as audience
    // await expectMCUVisibleForAudience(page)

    // const roomPermissions: any = await page.evaluate(() => {
    //   // @ts-expect-error
    //   const roomObj: Video.RoomSession = window._roomObj
    //   return roomObj.permissions
    // })
    // expect(roomPermissions).toStrictEqual(audiencePermissions)

    // // --------------- Unmuting Audio (self) and expecting 403 ---------------
    // const errorCode: any = await page.evaluate(async () => {
    //   // @ts-expect-error
    //   const roomObj: Video.RoomSession = window._roomObj
    //   const error = await roomObj.audioUnmute().catch((error) => error)

    //   return error.code
    // })
    // expect(errorCode).toBe('403')
  })
})
