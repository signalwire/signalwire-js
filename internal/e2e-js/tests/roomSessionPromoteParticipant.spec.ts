import { test, expect } from '../fixtures'
import type { Video } from '@signalwire/js'
import {
  createTestRoomSession,
  SERVER_URL,
  expectRoomJoined,
  expectMCUVisible,
} from '../utils'

test.describe('RoomSession promote myself', () => {
  test('should get 202 on trying to promote a member', async ({
    createCustomPage,
  }) => {
    const pageOne = await createCustomPage({ name: '[page]' })

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
    await expectRoomJoined(pageOne)

    // Checks that the video is visible on pageOne
    await expectMCUVisible(pageOne)

    // --------------- Promote participant from pageOne and resolve on error ---------------
    const promoteResponse: any = await pageOne.evaluate(() => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj

      return roomObj
        .promote({
          memberId: roomObj.memberId,
          permissions: ['room.member.promote', 'room.member.demote'],
        })
        .then(() => true)
        .catch(() => false)
    })

    expect(promoteResponse).toBe(true)
  })
})
