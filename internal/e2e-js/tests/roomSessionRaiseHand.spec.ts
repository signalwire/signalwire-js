import type { Video } from '@signalwire/js'
import { test, expect } from '../fixtures'
import {
  SERVER_URL,
  createTestRoomSession,
  randomizeRoomName,
  expectMCUVisible,
  expectRoomJoinedEvent,
  joinRoom,
  expectPageEvalToPass,
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
    const joinedPromise = expectRoomJoinedEvent(page, {
      message: 'Waiting for room.joined (raise/lower priority)',
    })
    await joinRoom(page, { message: 'Joining room (raise/lower priority)' })
    const joinParams = await joinedPromise

    expect(joinParams.room).toBeDefined()
    expect(joinParams.room_session).toBeDefined()
    expect(joinParams.room.name).toBe(roomName)
    expect(joinParams.room.prioritize_handraise).toBe(false)

    // Checks that the video is visible
    await expectMCUVisible(page)

    // --------------- Set hand raise priority ---------------
    await expectPageEvalToPass(page, {
      evaluateArgs: { roomSessionId: joinParams.room_session.id },
      evaluateFn: async ({ roomSessionId }) => {
        const roomObj = window._roomObj as Video.RoomSession

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
      assertionFn: (ok) => expect(ok).toBe(true),
      message: 'Expected prioritize_handraise to be set to true',
    })
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
    const joinedPromise2 = expectRoomJoinedEvent(page, {
      message: 'Waiting for room.joined (raise/lower hand)',
    })
    await joinRoom(page, { message: 'Joining room (raise/lower hand)' })
    const joinParams = await joinedPromise2

    expect(joinParams.room).toBeDefined()
    expect(joinParams.room_session).toBeDefined()
    expect(joinParams.room.name).toBe(roomName)

    // Checks that the video is visible
    await expectMCUVisible(page)

    // --------------- Raise a member's hand ---------------
    await expectPageEvalToPass(page, {
      evaluateArgs: { roomSessionId: joinParams.room_session.id },
      evaluateFn: async ({ roomSessionId }) => {
        const roomObj = window._roomObj as Video.RoomSession

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
      assertionFn: (ok) => expect(ok).toBe(true),
      message: "Expected member's hand to be raised",
    })

    await page.waitForTimeout(1000)

    // --------------- Lower a member's hand ---------------
    await expectPageEvalToPass(page, {
      evaluateArgs: { roomSessionId: joinParams.room_session.id },
      evaluateFn: async ({ roomSessionId }) => {
        const roomObj = window._roomObj as Video.RoomSession

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
      assertionFn: (ok) => expect(ok).toBe(true),
      message: "Expected member's hand to be lowered",
    })
  })
})
