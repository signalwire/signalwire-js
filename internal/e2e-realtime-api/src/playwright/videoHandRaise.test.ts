import util from 'util'
import { test, expect } from '@playwright/test'
import { Video } from '@signalwire/realtime-api'
import {
  createRoomAndJoinTwoMembers,
  expectMemberUpdated,
  leaveRoom,
} from './videoUtils'

test.describe('Video room hand raise/lower', () => {
  test('should raise memberOne hand using room session instance via Node SDK', async ({
    browser,
  }) => {
    console.log(
      '===Test===',
      'should raise memberOne hand using room session instance via Node SDK'
    )

    const { client, pageOne, pageTwo, memberOne, memberTwo, roomSession } =
      await createRoomAndJoinTwoMembers(browser)

    // Expect no hand raise from both members
    expect(memberOne.handraised).toBe(false)
    expect(memberTwo.handraised).toBe(false)

    // Expect member.updated event on pageOne via Web SDK for memberOne
    const memberOnePageOne = expectMemberUpdated({
      page: pageOne,
      memberId: memberOne.id,
    })

    // Expect member.updated event on pageTwo via Web SDK for memberOne
    const memberOnePageTwo = expectMemberUpdated({
      page: pageTwo,
      memberId: memberOne.id,
    })

    // Raise a hand of memberOne using Node SDK
    const memberOneNode = new Promise<Video.RoomSessionMember>(
      async (resolve, _reject) => {
        await roomSession.listen({
          onMemberUpdated: (member) => {
            if (member.name === memberOne.name) {
              resolve(member)
            }
          },
        })
        await roomSession.setRaisedHand({ memberId: memberOne.id })
      }
    )

    const promise = await Promise.all([
      memberOneNode,
      memberOnePageOne,
      memberOnePageTwo,
    ])

    console.log(
      'Resolved promise',
      util.inspect(promise, { showHidden: false, depth: null, colors: true })
    )

    const [
      memberOneUpdatedNode,
      memberOnePageOneUpdatedWeb,
      memberOnePageTwoUpdatedWeb,
    ] = promise

    // Expect a hand raise to be true on both Node & Web SDKs for memberOne only
    expect(memberOneUpdatedNode.handraised).toBe(true)
    expect(memberOnePageOneUpdatedWeb.handraised).toBe(true)
    expect(memberOnePageTwoUpdatedWeb.handraised).toBe(true)

    // memberTwo hand should not be raised
    expect(memberTwo.handraised).toBe(false)

    // Leave rooms on both pages
    await leaveRoom({ page: pageOne })
    await leaveRoom({ page: pageTwo })

    // Disconnect the client
    await client.disconnect()
  })

  // test('should raise memberTwo hand using member instance via Node SDK', async ({
  //   browser,
  // }) => {
  //   console.log(
  //     '===Test===',
  //     'should raise memberTwo hand using member instance via Node SDK'
  //   )

  //   const { client, pageOne, pageTwo, memberOne, memberTwo, roomSession } =
  //     await createRoomAndJoinTwoMembers(browser)

  //   // Expect no hand raise from both members
  //   expect(memberOne.handraised).toBe(false)
  //   expect(memberTwo.handraised).toBe(false)

  //   // Expect member.updated event on pageOne via Web SDK for memberTwo
  //   const memberTwoPageOne = expectMemberUpdated({
  //     page: pageOne,
  //     memberId: memberTwo.id,
  //   })

  //   // Expect member.updated event on pageTwo via Web SDK for memberTwo
  //   const memberTwoPageTwo = expectMemberUpdated({
  //     page: pageTwo,
  //     memberId: memberTwo.id,
  //   })

  //   // Raise memberTwo hand using a member object via Node SDK
  //   const memberTwoUpdatedNode = await new Promise<Video.RoomSessionMember>(
  //     async (resolve, _reject) => {
  //       await roomSession.listen({
  //         onMemberUpdated: (member) => {
  //           if (member.name === memberTwo.name) {
  //             resolve(member)
  //           }
  //         },
  //       })
  //       await memberTwo.setRaisedHand()
  //     }
  //   )

  //   // Wait for member.updated events to be received on the Web SDK for both pages
  //   const memberTwoPageOneUpdatedWeb = await memberTwoPageOne
  //   const memberTwoPageTwoUpdatedWeb = await memberTwoPageTwo

  //   // Expect a hand raise to be true on both Node & Web SDKs for memberTwo only
  //   expect(memberTwoUpdatedNode.handraised).toBe(true)
  //   expect(memberTwoPageOneUpdatedWeb.handraised).toBe(true)
  //   expect(memberTwoPageTwoUpdatedWeb.handraised).toBe(true)

  //   // Leave rooms on both pages
  //   await leaveRoom({ page: pageOne })
  //   await leaveRoom({ page: pageTwo })

  //   // Disconnect the client
  //   await client.disconnect()
  // })

  // test('should lower memberOne hand using room session instance via Web SDK', async ({
  //   browser,
  // }) => {
  //   console.log(
  //     '===Test===',
  //     'should lower memberOne hand using room session instance via Web SDK'
  //   )

  //   const { client, pageOne, pageTwo, memberOne, memberTwo, roomSession } =
  //     await createRoomAndJoinTwoMembers(browser)

  //   // Expect no hand raise from both members
  //   expect(memberOne.handraised).toBe(false)
  //   expect(memberTwo.handraised).toBe(false)

  //   // First raise the hand using Node SDK
  //   await new Promise<Video.RoomSessionMember>(async (resolve, _reject) => {
  //     await roomSession.listen({
  //       onMemberUpdated: (member) => {
  //         if (member.name === memberOne.name) {
  //           resolve(member)
  //         }
  //       },
  //     })
  //     await roomSession.setRaisedHand({ memberId: memberOne.id })
  //   })

  //   // Expect hand raise from memberOne
  //   expect(memberOne.handraised).toBe(true)

  //   // Expect member.updated event on pageOne via Web SDK for memberOne
  //   const memberOnePageOne = expectMemberUpdated({
  //     page: pageOne,
  //     memberId: memberOne.id,
  //   })

  //   // Expect member.updated event on pageTwo via Web SDK for memberOne
  //   const memberOnePageTwo = expectMemberUpdated({
  //     page: pageTwo,
  //     memberId: memberOne.id,
  //   })

  //   // Expect member.updated event via Node SDK for memberOne
  //   const memberOneNode = new Promise<Video.RoomSessionMember>(
  //     async (resolve, _reject) => {
  //       await roomSession.listen({
  //         onMemberUpdated: (member) => {
  //           if (member.name === memberOne.name) {
  //             resolve(member)
  //           }
  //         },
  //       })
  //     }
  //   )

  //   // Now lower the memberOne hand using the Web SDK
  //   await pageOne.evaluate(async () => {
  //     // @ts-expect-error
  //     const roomSession = window._roomObj

  //     // MemberId is not needed here since roomSession on pageOne refers to memberOne's roomSession
  //     await roomSession.setRaisedHand({ raised: false })
  //   })

  //   // Wait for member.updated events to be received on the Web SDK for both pages
  //   const memberOnePageOneUpdatedWeb = await memberOnePageOne
  //   const memberOnePageTwoUpdatedWeb = await memberOnePageTwo

  //   // Wait for member.updated events to be received on the Node SDK
  //   const memberOneUpdatedNode = await memberOneNode

  //   // Expect a hand raise to be false on both Node & Web SDKs for memberOne only
  //   expect(memberOneUpdatedNode.handraised).toBe(false)
  //   expect(memberOnePageOneUpdatedWeb.handraised).toBe(false)
  //   expect(memberOnePageTwoUpdatedWeb.handraised).toBe(false)

  //   // Leave rooms on both pages
  //   await leaveRoom({ page: pageOne })
  //   await leaveRoom({ page: pageTwo })

  //   // Disconnect the client
  //   await client.disconnect()
  // })
})
