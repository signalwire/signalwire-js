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
  expectTotalAudioEnergyToBeGreaterThan,
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

    // --------------- Joining from the 1st tab as member and resolve on 'room.joined' ---------------
    await expectRoomJoined(pageOne)

    // Checks that the video is visible on pageOne
    await expectMCUVisible(pageOne)

    // --------------- Joining from the 2st tab as audience and resolve on 'room.joined' ---------------
    const pageTwoRoomJoined = await expectRoomJoined(pageTwo)

    // Stable ref of the initial memberId
    const participant2Id = pageTwoRoomJoined.member_id

    // --------------- Make sure pageTwo exposes the correct memberId  ---------------
    await expectMemberId(pageTwo, participant2Id)

    // Checks that the video is visible on pageTwo
    await expectMCUVisible(pageTwo)

    // --------------- Check that the participant on pageTwo is receiving non-silence ---------------
    // --------------- Wait a bit for the media to flow ---------------
    await pageOne.waitForTimeout(5000)
    await expectTotalAudioEnergyToBeGreaterThan(pageTwo, 0.1)

    await pageOne.waitForTimeout(5000)
    await expectTotalAudioEnergyToBeGreaterThan(pageTwo, 0.5)

    // --------------- Demote participant on pageTwo to audience from pageOne
    // and resolve on `member.left` amd `layout.changed` with position off-canvas ---------------
    await pageOne.evaluate(
      async ({ demoteMemberId }) => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj

        const waitForLayoutChangedDemotedInvisible = new Promise(
          (resolve, reject) => {
            roomObj.on('layout.changed', ({ layout }) => {
              for (const layer of layout.layers) {
                // console.log("Layer member ID:", layer.member_id, "Demoted member ID:", demoteMemberId, " Position:", layer.position)
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

    // --------------- Make sure member_id is the same after promote and demote on pageTwo ---------------
    await expectMemberId(pageTwo, participant2Id) // before promote
    await expectMemberId(pageTwo, promiseAudienceRoomJoined.member_id) // after promote

    // --------------- Make sure on pageTwo he is an audience member ---------------
    await expectInteractivityMode(pageTwo, 'audience')

    // --------------- Check SDP/RTCPeer on audience (audience again so recvonly) ---------------
    await expectSDPDirection(pageTwo, 'recvonly', true)
  })
})
