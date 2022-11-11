import { test, expect, Page } from '@playwright/test'
import type { Video } from '@signalwire/js'
import { createTestServer, createTestRoomSession } from '../utils'

test.describe('RoomSession promote/demote methods', () => {
  let server: any = null

  test.beforeAll(async () => {
    server = await createTestServer()
    await server.start()
  })

  test.afterAll(async () => {
    await server.close()
  })

  test('should promote/demote audience', async ({ context }) => {
    const pageOne = await context.newPage()
    const pageTwo = await context.newPage()

    pageOne.on('console', (log) => console.log('[pageOne]', log))
    pageTwo.on('console', (log) => console.log('[pageTwo]', log))

    await Promise.all([pageOne.goto(server.url), pageTwo.goto(server.url)])

    const memberSettings = {
      vrt: {
        room_name: 'promotion-room',
        user_name: 'e2e_member',
        auto_create_room: true,
        permissions: ['room.member.demote', 'room.member.promote'],
      },
      initialEvents: ['member.joined', 'member.updated', 'member.left'],
    }

    const audienceSettings = {
      vrt: {
        room_name: 'promotion-room',
        user_name: 'e2e_audience',
        join_as: 'audience' as const,
        auto_create_room: true,
        permissions: [],
      },
      initialEvents: ['member.joined', 'member.updated', 'member.left'],
    }

    await Promise.all([
      createTestRoomSession(pageOne, memberSettings),
      createTestRoomSession(pageTwo, audienceSettings),
    ])

    const expectAudienceSDP = async (direction: string, value: boolean) => {
      const pageTwoSDP = await pageTwo.evaluate(async () => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj
        // @ts-expect-error
        return roomObj.peer.localSdp
      })

      expect(pageTwoSDP.split('m=')[1].includes(direction)).toBe(value)
      expect(pageTwoSDP.split('m=')[2].includes(direction)).toBe(value)
    }

    const expectInteractivityMode = async (
      page: Page,
      mode: 'member' | 'audience'
    ) => {
      const interactivityMode = await page.evaluate(async () => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj
        return roomObj.interactivityMode
      })

      expect(interactivityMode).toEqual(mode)
    }

    // --------------- Joining from the 1st tab as member and resolve on 'room.joined' ---------------
    await pageOne.evaluate(() => {
      return new Promise((resolve) => {
        // @ts-expect-error
        const roomObj = window._roomObj
        roomObj.on('room.joined', resolve)
        roomObj.join()
      })
    })

    // --------------- Make sure on pageOne we have a member ---------------
    await expectInteractivityMode(pageOne, 'member')

    // Checks that the video is visible on pageOne
    await pageOne.waitForSelector('div[id^="sw-sdk-"] > video', {
      timeout: 5000,
    })

    // --------------- Joining from the 2st tab as audience and resolve on 'room.joined' ---------------
    const pageTwoRoomJoined: any = await pageTwo.evaluate(() => {
      return new Promise((resolve) => {
        // @ts-expect-error
        const roomObj = window._roomObj
        roomObj.on('room.joined', resolve)
        roomObj.join()
      })
    })

    // --------------- Make sure on pageTwo we have a audience ---------------
    await expectInteractivityMode(pageTwo, 'audience')

    // --------------- Check SDP/RTCPeer on audience (recvonly since audience) ---------------
    await expectAudienceSDP('recvonly', true)

    // Checks that the video is visible on pageTwo
    await pageTwo.waitForSelector('#rootElement video', {
      timeout: 10000,
    })

    // --------------- Promote audience from pageOne and resolve on `member.joined` ---------------
    await pageOne.evaluate(
      async ({ promoteMemberId }) => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj

        const waitForMemberJoined = new Promise((resolve, reject) => {
          roomObj.on('member.joined', ({ member }) => {
            if (member.name === 'e2e_audience') {
              resolve(true)
            } else {
              reject(new Error('[member.joined] Name is not "e2e_audience"'))
            }
          })
        })

        await roomObj.promote({
          memberId: promoteMemberId,
          permissions: ['room.list_available_layouts'],
        })

        return waitForMemberJoined
      },
      { promoteMemberId: pageTwoRoomJoined.member_id }
    )

    await pageTwo.waitForTimeout(2000)

    // --------------- Make sure on pageTwo we have a member now ---------------
    await expectInteractivityMode(pageTwo, 'member')

    // --------------- Check SDP/RTCPeer on audience (now member so sendrecv) ---------------
    await expectAudienceSDP('sendrecv', true)

    await pageTwo.waitForTimeout(2000)

    const pageTwoMemberId = await pageTwo.evaluate(async () => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj
      return roomObj.memberId
    })

    // TODO: We still need member.left to be generated in the future, after a participant is demoted and has in fact left the room
    // --------------- Demote to audience again from pageOne and resolve on `member.updated` with position off-canvas ---------------
    await pageOne.evaluate(
      async ({ demoteMemberId }) => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj

        const waitForLayoutChangedDemotedInvisible = new Promise((resolve, reject) => {
          roomObj.on('layout.changed', ({ layout }) => {
            for (const layer of layout.layers) {
              console.log("Layer member ID:", layer.member_id, "Demoted member ID:", demoteMemberId, " Position:", layer.position)
              if (layer.member_id === demoteMemberId && layer.visible === true) {
                reject(new Error('[layout.changed] Demoted member is still visible'))
              }
            }
            resolve(true)
          })
        })

        /*
        const waitForMemberLeft = new Promise((resolve, reject) => {
          roomObj.on('member.left', ({ member }) => {
            if (member.name === 'e2e_audience') {
              resolve(true)
            } else {
              reject(new Error('[member.left] Name is not "e2e_audience"'))
            }
          })
        })
        */

        await roomObj.demote({
          memberId: demoteMemberId,
        })

        return waitForLayoutChangedDemotedInvisible
        //return waitForMemberLeft
      },
      { demoteMemberId: pageTwoMemberId }
    )

    await pageTwo.waitForTimeout(2000)

    // --------------- Make sure on pageTwo he got back to audience ---------------
    await expectInteractivityMode(pageTwo, 'audience')

    // --------------- Check SDP/RTCPeer on audience (audience again so recvonly) ---------------
    await expectAudienceSDP('recvonly', true)

    await pageTwo.waitForTimeout(2000)

    // --------------- Leaving the rooms ---------------
    await Promise.all([
      // @ts-expect-error
      pageOne.evaluate(() => window._roomObj.leave()),
      // @ts-expect-error
      pageTwo.evaluate(() => window._roomObj.leave()),
    ])
  })
})
