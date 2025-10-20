import { uuid } from '@signalwire/core'
import { test, expect } from '../../fixtures'
import {
  createCFClient,
  dialAddress,
  expectMCUVisible,
  SERVER_URL,
} from '../../utils'
import { CallSession } from '@signalwire/client'

test.describe('CallCall Raise/Lower Hand', () => {
  test("should join a room and be able to raise/lower self member's hand", async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e_${uuid()}`
    await resource.createCallSessionResource(roomName)

    await createCFClient(page)

    // Dial an address and join a video room
    const callSession = await dialAddress(page, {
      address: `/public/${roomName}?channel=video`,
    })

    expect(callSession.room_session).toBeDefined()
    expect(
      callSession.room_session.members.some(
        (member: any) => member.member_id === callSession.member_id
      )
    ).toBeTruthy()

    await expectMCUVisible(page)

    // --------------- Raise a self member hand ---------------
    await page.evaluate(
      async ({ callSessionId }) => {
        // @ts-expect-error
        const callObj: CallSession = window._callObj

        const memberUpdated = new Promise((resolve) => {
          callObj.on('member.updated', (params: any) => {
            if (
              params.room_session_id === callSessionId &&
              params.member.handraised == true
            ) {
              resolve(true)
            }
          })
        })

        await callObj.setRaisedHand()

        return memberUpdated
      },
      { callSessionId: callSession.room_session.room_session_id }
    )

    // --------------- Lower a self member hand ---------------
    await page.evaluate(
      async ({ callSessionId }) => {
        // @ts-expect-error
        const callObj: CallSession = window._callObj

        const memberUpdated = new Promise((resolve) => {
          callObj.on('member.updated', (params: any) => {
            if (
              params.room_session_id === callSessionId &&
              params.member.handraised == false
            ) {
              resolve(true)
            }
          })
        })

        await callObj.setRaisedHand({ raised: false })

        return memberUpdated
      },
      { callSessionId: callSession.room_session.room_session_id }
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

    const roomName = `e2e_${uuid()}`
    await resource.createCallSessionResource(roomName)

    // Create client, dial an address and join a video room from page-one
    await createCFClient(pageOne)
    const callSessionOne = await dialAddress(pageOne, {
      address: `/public/${roomName}?channel=video`,
    })

    expect(callSessionOne.room_session).toBeDefined()
    expect(
      callSessionOne.room_session.members.some(
        (member: any) => member.member_id === callSessionOne.member_id
      )
    ).toBeTruthy()

    await expectMCUVisible(pageOne)

    // Create client, dial an address and join a video room from page-two
    await createCFClient(pageTwo)
    const callSessionTwo = await dialAddress(pageTwo, {
      address: `/public/${roomName}?channel=video`,
    })

    expect(callSessionTwo.room_session).toBeDefined()
    expect(
      callSessionTwo.room_session.members.some(
        (member: any) => member.member_id === callSessionTwo.member_id
      )
    ).toBeTruthy()

    await expectMCUVisible(pageTwo)

    const members = callSessionTwo.room_session.members
    expect(members).toHaveLength(2)

    // --------------- Raise other member's hand ---------------
    await pageOne.evaluate(
      async ({ callSessionTwoId, memberOneId }) => {
        // @ts-expect-error
        const callObj: CallSession = window._callObj // This is a callSessionTwo object

        const memberUpdated = new Promise((resolve) => {
          callObj.on('member.updated', (params: any) => {
            if (
              params.room_session_id === callSessionTwoId &&
              params.member.member_id === memberOneId &&
              params.member.handraised == true
            ) {
              resolve(true)
            }
          })
        })

        await callObj.setRaisedHand({ memberId: memberOneId })

        return memberUpdated
      },
      {
        callSessionTwoId: callSessionTwo.room_session.room_session_id,
        memberOneId: members[0].member_id,
      }
    )

    // --------------- Lower other member's hand ---------------
    await pageOne.evaluate(
      async ({ callSessionTwoId, memberOneId }) => {
        // @ts-expect-error
        const callObj: CallSession = window._callObj // This is a callSessionTwo object

        const memberUpdated = new Promise((resolve) => {
          callObj.on('member.updated', (params: any) => {
            if (
              params.room_session_id === callSessionTwoId &&
              params.member.member_id === memberOneId &&
              params.member.handraised == false
            ) {
              resolve(true)
            }
          })
        })

        await callObj.setRaisedHand({ raised: false, memberId: memberOneId })

        return memberUpdated
      },
      {
        callSessionTwoId: callSessionTwo.room_session.room_session_id,
        memberOneId: members[0].member_id,
      }
    )
  })
})
