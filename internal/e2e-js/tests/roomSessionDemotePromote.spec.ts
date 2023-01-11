import { test } from '@playwright/test'
import type { Video } from '@signalwire/js'
import {
  SERVER_URL,
  createTestRoomSession,
  expectSDPDirection,
  expectInteractivityMode,
  expectMemberId,
  randomizeRoomName,
} from '../utils'

test.describe('RoomSession demote participant and then promote again', () => {
  test('should demote participant and then promote again', async ({
    context,
  }) => {
    const pageOne = await context.newPage()
    const pageTwo = await context.newPage()

    await Promise.all([pageOne.goto(SERVER_URL), pageTwo.goto(SERVER_URL)])

    const room_name = randomizeRoomName()

    const participant1Settings = {
      vrt: {
        room_name: room_name,
        user_name: 'e2e_participant',
        auto_create_room: true,
        permissions: ['room.member.demote', 'room.member.promote'],
      },
      initialEvents: ['member.joined', 'member.updated', 'member.left'],
    }

    const participant2Settings = {
      vrt: {
        room_name: room_name,
        user_name: 'e2e_target_participant',
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
    await pageOne.evaluate(() => {
      return new Promise((resolve) => {
        // @ts-expect-error
        const roomObj = window._roomObj
        roomObj.on('room.joined', resolve)
        roomObj.join()
      })
    })
    await expectInteractivityMode(pageOne, 'member')
    await expectSDPDirection(pageOne, 'sendrecv', true)

    // Checks that the video is visible on pageOne
    await pageOne.waitForSelector('div[id^="sw-sdk-"] > video', {
      timeout: 5000,
    })

    // --------------- Joining from the 2nd tab as member and resolve on 'room.joined' ---------------
    const pageTwoRoomJoined: any = await pageTwo.evaluate(() => {
      return new Promise((resolve) => {
        // @ts-expect-error
        const roomObj = window._roomObj
        roomObj.once('room.joined', resolve)
        roomObj.join()
      })
    })

    const participant2Id = pageTwoRoomJoined.member_id
    await expectInteractivityMode(pageTwo, 'member')
    await expectMemberId(pageTwo, participant2Id)
    await expectSDPDirection(pageTwo, 'sendrecv', true)

    // Checks that the video is visible on pageTwo
    await pageTwo.waitForSelector('div[id^="sw-sdk-"] > video', {
      timeout: 10000,
    })
    // --------------- Sessions established ---------------

    await pageTwo.waitForTimeout(2000)

    // --------------- Demote participant on pageTwo to audience from pageOne
    // and resolve on `member.left` amd `layout.changed` with position off-canvas ---------------
    const promiseMemberWaitingForMemberLeft = pageOne.evaluate(
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
            if (member.name === 'e2e_target_participant') {
              resolve(true)
            } else {
              reject(
                new Error('[member.left] Name is not "e2e_target_participant"')
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

    await promiseMemberWaitingForMemberLeft

    const promiseAudienceRoomJoined = await pageTwo.evaluate<any>(() => {
      return new Promise((resolve) => {
        // @ts-expect-error
        const roomObj = window._roomObj
        roomObj.once('room.joined', resolve)
      })
    })

    // --------------- Make sure member_id is the same after demote on pageTwo ---------------
    await expectMemberId(pageTwo, participant2Id) // before demote
    await expectMemberId(pageTwo, promiseAudienceRoomJoined.member_id) // after demote

    await expectInteractivityMode(pageTwo, 'audience')
    await expectSDPDirection(pageTwo, 'recvonly', true)

    // --------------- Time to promote again at PageTwo ---------------

    await pageTwo.waitForTimeout(2000)

    // --------------- Promote audience from pageOne and resolve on `member.joined` ---------------
    const promiseMemberWaitingForMemberJoin = pageOne.evaluate(
      async ({ promoteMemberId }) => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj

        const waitForMemberJoined = new Promise((resolve, reject) => {
          roomObj.on('member.joined', ({ member }) => {
            if (
              member.name === 'e2e_target_participant' &&
              member.id === promoteMemberId
            ) {
              console.log(
                '=======================> Member joined:',
                member.name
              )
              resolve(true)
            } else {
              reject(
                new Error(
                  '[member.joined] Name is not "e2e_target_participant"'
                )
              )
            }
          })
        })

        await roomObj.promote({
          memberId: promoteMemberId,
          permissions: ['room.list_available_layouts'],
        })

        return waitForMemberJoined
      },
      { promoteMemberId: participant2Id }
    )

    const promisePromotedRoomJoined = pageTwo.evaluate<any>(() => {
      return new Promise((resolve) => {
        // @ts-expect-error
        const roomObj = window._roomObj
        roomObj.once('room.joined', resolve)
      })
    })

    await Promise.all([
      promiseMemberWaitingForMemberJoin,
      promisePromotedRoomJoined,
    ])

    await expectMemberId(pageTwo, participant2Id)
    await expectInteractivityMode(pageTwo, 'member')
    await expectSDPDirection(pageTwo, 'sendrecv', true)
    // Checks that the video is visible on pageTwo
    await pageTwo.waitForSelector('div[id^="sw-sdk-"] > video', {
      timeout: 10000,
    })

    // --------------- Leaving the rooms ---------------
    await Promise.all([
      // @ts-expect-error
      pageOne.evaluate(() => window._roomObj.leave()),
      // @ts-expect-error
      pageTwo.evaluate(() => window._roomObj.leave()),
    ])
  })
})
