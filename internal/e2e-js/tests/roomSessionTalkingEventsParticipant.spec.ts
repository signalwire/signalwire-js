import { test, expect } from '../fixtures'
import {
  SERVER_URL,
  createTestRoomSession,
  expectRoomJoined,
  expectMCUVisible,
  expectMemberTalkingEvent,
} from '../utils'

test.describe('RoomSession talking events to participant', () => {
  test('participant should receive talking events', async ({
    createCustomPage,
  }) => {
    const pageOne = await createCustomPage({ name: '[pageOne]' })
    const pageTwo = await createCustomPage({ name: '[pageTwo]' })

    await Promise.all([pageOne.goto(SERVER_URL), pageTwo.goto(SERVER_URL)])

    const member1Settings = {
      vrt: {
        room_name: 'talking-room',
        user_name: 'e2e_member1',
        auto_create_room: true,
        permissions: ['room.self.audio_mute', 'room.self.audio_unmute'],
      },
      initialEvents: ['member.talking'],
    }

    // member2 will join audio_muted
    const member2Settings = {
      vrt: {
        room_name: 'talking-room',
        user_name: 'e2e_member2',
        auto_create_room: true,
        permissions: ['room.self.audio_mute', 'room.self.audio_unmute'],
        join_audio_muted: true,
      },
      initialEvents: ['member.talking'],
    }

    await Promise.all([
      createTestRoomSession(pageOne, member1Settings),
      createTestRoomSession(pageTwo, member2Settings),
    ])

    await expectRoomJoined(pageTwo)

    await expectMCUVisible(pageTwo)

    const talkingTruePromisePageTwo = expectMemberTalkingEvent(pageTwo)

    const joinParams: any = await expectRoomJoined(pageOne)

    await expectMCUVisible(pageOne)

    // Wait 5 seconds for the audio to stabilize
    await pageOne.waitForTimeout(5000)

    const talkingTrueEvent = await talkingTruePromisePageTwo

    expect(talkingTrueEvent).toStrictEqual({
      room_id: joinParams.room_session.room_id,
      room_session_id: joinParams.room_session.id,
      member: {
        id: joinParams.member_id,
        talking: true,
      },
    })

    const talkingFalsePromisePageTwo = expectMemberTalkingEvent(pageTwo)

    // --------------- Muting Member on pageOne ---------------
    await pageOne.evaluate(async () => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj

      await roomObj.audioMute()
    })

    const talkingFalseEvent = await talkingFalsePromisePageTwo

    expect(talkingFalseEvent).toStrictEqual({
      room_id: joinParams.room_session.room_id,
      room_session_id: joinParams.room_session.id,
      member: {
        id: joinParams.member_id,
        talking: false,
      },
    })

    const talkingTrueAgainPromisePageTwo = expectMemberTalkingEvent(pageTwo)

    // --------------- Unmuting Member on pageOne ---------------
    await pageOne.evaluate(async () => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj

      await roomObj.audioUnmute()
    })

    const talkingTrueAgainEvent = await talkingTrueAgainPromisePageTwo

    expect(talkingTrueAgainEvent).toStrictEqual({
      room_id: joinParams.room_session.room_id,
      room_session_id: joinParams.room_session.id,
      member: {
        id: joinParams.member_id,
        talking: true,
      },
    })
  })
})
