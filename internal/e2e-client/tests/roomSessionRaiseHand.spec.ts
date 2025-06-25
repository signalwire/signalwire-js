import type { Video } from '@signalwire/client'
import { test, expect } from '../fixtures'
import {
  SERVER_URL,
  createTestRoomSession,
  randomizeRoomName,
  expectRoomJoined,
  expectMCUVisible,
} from '../utils'

test.describe('RoomSession Raise/Lower hand', () => {
  test('should join a room and be able to set hand prioritization', async ({
    createCustomPage,
  }) => {
    const page = await createCustomPage({ name: 'raise-lower' })
    await page.goto(SERVER_URL)

    const roomName = randomizeRoomName('raise-lower-e2e')
    const memberSettings = {
      vrt: {
        room_name: roomName,
        user_name: 'e2e_participant_meta',
        auto_create_room: true,
        permissions: ['room.prioritize_handraise'],
      },
      initialEvents: ['room.updated'],
    }

    await createTestRoomSession(page, memberSettings)

    // --------------- Joining the room ---------------
    const joinParams = await expectRoomJoined(page)

    expect(joinParams.room).toBeDefined()
    expect(joinParams.room_session).toBeDefined()
    expect(joinParams.room.name).toBe(roomName)
    expect(joinParams.room.prioritize_handraise).toBe(false)

    // Checks that the video is visible
    await expectMCUVisible(page)

    // --------------- Set hand raise priority ---------------
    await page.evaluate(
      async ({ roomSessionId }) => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj

        const roomUpdated = new Promise((resolve) => {
          roomObj.on('room.updated', (params) => {
            if (
              params.room_session.id === roomSessionId &&
              params.room_session.prioritize_handraise == true
            ) {
              resolve(true)
            }
          })
        })

        await roomObj.setPrioritizeHandraise(true)

        return roomUpdated
      },
      { roomSessionId: joinParams.room_session.id }
    )
  })

  test("should join a room and be able to raise/lower member's hand", async ({
    createCustomPage,
  }) => {
    const page = await createCustomPage({ name: 'raise-lower' })
    await page.goto(SERVER_URL)

    const roomName = randomizeRoomName('raise-lower-e2e')
    const memberSettings = {
      vrt: {
        room_name: roomName,
        user_name: 'e2e_participant_meta',
        auto_create_room: true,
        permissions: ['room.member.raisehand', 'room.member.lowerhand'],
      },
      initialEvents: ['member.joined', 'member.updated', 'member.left'],
    }

    await createTestRoomSession(page, memberSettings)

    // --------------- Joining the room ---------------
    const joinParams = await expectRoomJoined(page)

    expect(joinParams.room).toBeDefined()
    expect(joinParams.room_session).toBeDefined()
    expect(joinParams.room.name).toBe(roomName)

    // Checks that the video is visible
    await expectMCUVisible(page)

    // --------------- Raise a member's hand ---------------
    await page.evaluate(
      async ({ roomSessionId }) => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj

        const memberUpdated = new Promise((resolve) => {
          roomObj.on('member.updated', (params) => {
            if (
              params.room_session_id === roomSessionId &&
              params.member.handraised == true
            ) {
              resolve(true)
            }
          })
        })

        await roomObj.setRaisedHand()

        return memberUpdated
      },
      { roomSessionId: joinParams.room_session.id }
    )

    await page.waitForTimeout(1000)

    // --------------- Lower a member's hand ---------------
    await page.evaluate(
      async ({ roomSessionId }) => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj

        const memberUpdated = new Promise((resolve) => {
          roomObj.on('member.updated', (params) => {
            if (
              params.room_session_id === roomSessionId &&
              params.member.handraised == false
            ) {
              resolve(true)
            }
          })
        })

        await roomObj.setRaisedHand({ raised: false })

        return memberUpdated
      },
      { roomSessionId: joinParams.room_session.id }
    )
  })
})
