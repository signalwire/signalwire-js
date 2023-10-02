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
    const pageOne = await createCustomPage({ name: '[outbound]' })
    await pageOne.goto(`${SERVER_URL}/index-v2.html`)

    const pageTwo = await createCustomPage({ name: '[inbound]' })
    await pageTwo.goto(`${SERVER_URL}/index-v2.html`)

    // const tokenOne = await getJWTV2('outbound')
    // const tokenTwo = await getJWTV2('inbound')

    const project = pageOne.locator('#project')
    const token = pageOne.locator('#token')

    await project.fill(process.env.RELAY_TOKEN as string)
    await token.fill('token')
    await pageOne.screenshot({ path: 'screen.png' })

    // const h1 = page.locator('h1')
    // expect(await h1.innerText()).toBe('Hello im v3!')
    // await page.waitForTimeout(10_000)

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
