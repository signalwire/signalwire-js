import { test } from '../fixtures'
import type { Video } from '@signalwire/js'
import {
  SERVER_URL,
  createTestRoomSession,
  expectMemberId,
  expectMCUVisible,
  expectPageReceiveAudio,
  expectRoomJoinWithDefaults,
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

    await test.step('join room from pageOne as a member', async () => {
      await expectRoomJoinWithDefaults(pageOne)
      await expectMCUVisible(pageOne)
    })

    const participant2Id =
      await test.step('join room from pageTwo as a member', async () => {
        const pageTwoRoomJoined = await expectRoomJoinWithDefaults(pageTwo)
        const participant2Id = pageTwoRoomJoined.member_id
        await expectMemberId(pageTwo, participant2Id)
        await expectMCUVisible(pageTwo)
        return participant2Id
      })

    // Wait five seconds before demoting
    await pageOne.waitForTimeout(5000)

    const promiseAudienceRoomJoined =
      test.step('wait for room.joined event on demoted participant', async () => {
        expectRoomJoinWithDefaults(pageTwo, {
          invokeJoin: false,
          joinAs: 'audience',
        })
      })

    const layoutChangeEventPromise =
      test.step('wait for layout.changed', async () => {
        await pageOne.evaluate(
          async ({ demoteMemberId }) => {
            // @ts-expect-error
            const roomObj: Video.RoomSession = window._roomObj

            return new Promise((resolve, reject) => {
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
            })
          },
          { demoteMemberId: participant2Id }
        )
      })

    const memberLeftEventPromise =
      test.step('wait for member.left event on demoted participant', async () => {
        await pageOne.evaluate(async () => {
          // @ts-expect-error
          const roomObj: Video.RoomSession = window._roomObj
          return new Promise((resolve, reject) => {
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
        })
      })

    // Demote participant on pageTwo to audience from pageOne
    // and resolve on `member.left` amd `layout.changed` with
    // position off-canvas
    await test.step('demote participant from pageOne', async () => {
      await pageOne.evaluate(
        async ({ demoteMemberId }) => {
          // @ts-expect-error
          const roomObj: Video.RoomSession = window._roomObj

          await roomObj.demote({
            memberId: demoteMemberId,
          })
        },
        { demoteMemberId: participant2Id }
      )
    })

    Promise.all([layoutChangeEventPromise, memberLeftEventPromise])

    // Expect same member ID as before demote
    await expectMemberId(pageTwo, participant2Id)

    // Make sure the demoted user received room.joined with correct states
    await promiseAudienceRoomJoined

    await expectPageReceiveAudio(pageTwo)
  })
})
