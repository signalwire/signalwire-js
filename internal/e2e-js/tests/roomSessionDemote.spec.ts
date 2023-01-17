import { test } from '../fixtures'
import type { Video } from '@signalwire/js'
import {
  SERVER_URL,
  createTestRoomSession,
  expectSDPDirection,
  expectInteractivityMode,
  expectMemberId,
  expectRoomJoined,
  expectMCUVisible,
  expectPageReceiveAudio,
} from '../utils'

test.describe('RoomSession demote participant', () => {
  test('should demote participant', async ({ createCustomPage }) => {
    const pageOne = await createCustomPage({ name: '[pageOne]' })
    const pageTwo = await createCustomPage({ name: '[pageTwo]' })

    await Promise.all([pageOne.goto(SERVER_URL), pageTwo.goto(SERVER_URL)])

    const participant1Settings = {
      vrt: {
        room_name: 'demotion-room',
        user_name: 'e2e_participant',
        auto_create_room: true,
        permissions: ['room.member.demote'],
      },
      initialEvents: ['member.joined', 'member.updated', 'member.left'],
    }

    const participant2Settings = {
      vrt: {
        room_name: 'demotion-room',
        user_name: 'e2e_participant_to_demote',
        auto_create_room: true,
        permissions: [],
      },
      initialEvents: ['member.joined', 'member.updated', 'member.left'],
    }

    await Promise.all([
      createTestRoomSession(pageOne, participant1Settings),
      createTestRoomSession(pageTwo, participant2Settings),
    ])

    await expectRoomJoined(pageOne)
    await expectMCUVisible(pageOne)

    const pageTwoRoomJoined = await expectRoomJoined(pageTwo)
    const participant2Id = pageTwoRoomJoined.member_id
    await expectMemberId(pageTwo, participant2Id)
    await expectMCUVisible(pageTwo)

    // Wait five seconds before demoting
    await pageOne.waitForTimeout(5000)

    // Demote participant on pageTwo to audience from pageOne
    // and resolve on `member.left` amd `layout.changed` with
    // position off-canvas
    await pageOne.evaluate(
      async ({ demoteMemberId }) => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj

        const waitForLayoutChangedDemotedInvisible = new Promise(
          (resolve, reject) => {
            roomObj.on('layout.changed', ({ layout }) => {
              for (const layer of layout.layers) {
                if (
                  layer.member_id === demoteMemberId &&
                  layer.visible === true
                ) {
                  reject(
                    new Error(
                      '[layout.changed] Demoted member is still visible'
                    )
                  )
                }
              }
              resolve(true)
            })
          }
        )

        const waitForMemberLeft = new Promise((resolve, reject) => {
          roomObj.on('member.left', ({ member }) => {
            if (member.name === 'e2e_participant_to_demote') {
              resolve(true)
            } else {
              reject(
                new Error(
                  '[member.left] Name is not "e2e_participant_to_demote"'
                )
              )
            }
          })
        })

        await roomObj.demote({
          memberId: demoteMemberId,
        })

        return Promise.all([
          waitForLayoutChangedDemotedInvisible,
          waitForMemberLeft,
        ])
      },
      { demoteMemberId: participant2Id }
    )

    const promiseAudienceRoomJoined = await expectRoomJoined(pageTwo, {
      invokeJoin: false,
    })

     // Expect same member ID as before demote
    await expectMemberId(pageTwo, participant2Id)
    await expectMemberId(pageTwo, promiseAudienceRoomJoined.member_id)
    await expectInteractivityMode(pageTwo, 'audience')
    await expectSDPDirection(pageTwo, 'recvonly', true)

    await expectPageReceiveAudio(pageTwo)
  })
})
