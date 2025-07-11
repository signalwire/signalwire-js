import { uuid } from '@signalwire/core'
import { test, expect } from '../../fixtures'
import {
  createCFClient,
  dialAddress,
  expectMCUVisible,
  SERVER_URL,
} from '../../utils'
import { FabricRoomSession } from '@signalwire/js'

test.describe('CallFabric Raise/Lower Hand', () => {
  test("should join a room and be able to raise/lower self member's hand", async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e_{uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page)

    // Dial an address and join a video room
    const roomSession = await dialAddress(page, {
      address: `/public/${roomName}?channel=video`,
    })

    expect(roomSession.room_session).toBeDefined()
    expect(
      roomSession.room_session.members.some(
        (member: any) => member.member_id === roomSession.member_id
      )
    ).toBeTruthy()

    await expectMCUVisible(page)

    // --------------- Raise a self member hand ---------------
    await page.evaluate(
      async ({ roomSessionId }) => {
        // @ts-expect-error
        const roomObj: FabricRoomSession = window._roomObj

        const memberUpdated = new Promise((resolve) => {
          roomObj.on('member.updated', (params: any) => {
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
      { roomSessionId: roomSession.room_session.room_session_id }
    )

    // --------------- Lower a self member hand ---------------
    await page.evaluate(
      async ({ roomSessionId }) => {
        // @ts-expect-error
        const roomObj: FabricRoomSession = window._roomObj

        const memberUpdated = new Promise((resolve) => {
          roomObj.on('member.updated', (params: any) => {
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
      { roomSessionId: roomSession.room_session.room_session_id }
    )
  })

  test("should join a room and be able to raise/lower other member's hand", async ({
    createCustomPage,
    resource,
  }) => {
    const pageOne = await createCustomPage({ name: '[page-one]' })
    const pageTwo = await createCustomPage({ name: '[page-two]' })
    await pageOne.goto(SERVER_URL)
    await pageTwo.goto(SERVER_URL)

    const roomName = `e2e_{uuid()}`
    await resource.createVideoRoomResource(roomName)

    // Create client, dial an address and join a video room from page-one
    await createCFClient(pageOne)
    const roomSessionOne = await dialAddress(pageOne, {
      address: `/public/${roomName}?channel=video`,
    })

    expect(roomSessionOne.room_session).toBeDefined()
    expect(
      roomSessionOne.room_session.members.some(
        (member: any) => member.member_id === roomSessionOne.member_id
      )
    ).toBeTruthy()

    await expectMCUVisible(pageOne)

    // Create client, dial an address and join a video room from page-two
    await createCFClient(pageTwo)
    const roomSessionTwo = await dialAddress(pageTwo, {
      address: `/public/${roomName}?channel=video`,
    })

    expect(roomSessionTwo.room_session).toBeDefined()
    expect(
      roomSessionTwo.room_session.members.some(
        (member: any) => member.member_id === roomSessionTwo.member_id
      )
    ).toBeTruthy()

    await expectMCUVisible(pageTwo)

    const members = roomSessionTwo.room_session.members
    expect(members).toHaveLength(2)

    // --------------- Raise other member's hand ---------------
    await pageOne.evaluate(
      async ({ roomSessionTwoId, memberOneId }) => {
        // @ts-expect-error
        const roomObj: FabricRoomSession = window._roomObj // This is a roomSessionTwo object

        const memberUpdated = new Promise((resolve) => {
          roomObj.on('member.updated', (params: any) => {
            if (
              params.room_session_id === roomSessionTwoId &&
              params.member.member_id === memberOneId &&
              params.member.handraised == true
            ) {
              resolve(true)
            }
          })
        })

        await roomObj.setRaisedHand({ memberId: memberOneId })

        return memberUpdated
      },
      {
        roomSessionTwoId: roomSessionTwo.room_session.room_session_id,
        memberOneId: members[0].member_id,
      }
    )

    // --------------- Lower other member's hand ---------------
    await pageOne.evaluate(
      async ({ roomSessionTwoId, memberOneId }) => {
        // @ts-expect-error
        const roomObj: FabricRoomSession = window._roomObj // This is a roomSessionTwo object

        const memberUpdated = new Promise((resolve) => {
          roomObj.on('member.updated', (params: any) => {
            if (
              params.room_session_id === roomSessionTwoId &&
              params.member.member_id === memberOneId &&
              params.member.handraised == false
            ) {
              resolve(true)
            }
          })
        })

        await roomObj.setRaisedHand({ raised: false, memberId: memberOneId })

        return memberUpdated
      },
      {
        roomSessionTwoId: roomSessionTwo.room_session.room_session_id,
        memberOneId: members[0].member_id,
      }
    )
  })
})
