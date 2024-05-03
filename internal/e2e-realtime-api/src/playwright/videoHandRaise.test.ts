import { test, expect } from '@playwright/test'
import { Video } from '@signalwire/realtime-api'
import {
  createRoomAndJoinTwoMembers,
  expectHandRaiseEvent,
  leaveRoom,
} from './videoUtils'
import { InternalVideoMemberEntityUpdated } from '@signalwire/core'

test.describe('Video room hand raise/lower', () => {
  test('should raise memberOne hand using room session instance via Node SDK', async ({
    browser,
  }) => {
    console.log(
      '===START===',
      'should raise memberOne hand using room session instance via Node SDK'
    )

    const { client, pageOne, pageTwo, memberOne, memberTwo, roomSession } =
      await createRoomAndJoinTwoMembers(browser)

    // Expect no hand raise from both members
    expect(memberOne.handraised).toBe(false)
    expect(memberTwo.handraised).toBe(false)

    // Expect member.updated event on pageOne via Web SDK for memberOne
    const memberOnePageOneHandRaised = expectHandRaiseEvent({
      page: pageOne,
      memberId: memberOne.id,
    })

    // Expect member.updated event on pageTwo via Web SDK for memberOne
    const memberOnePageTwoHandRaised = expectHandRaiseEvent({
      page: pageTwo,
      memberId: memberOne.id,
    })

    // Raise a hand of memberOne using Node SDK
    const memberOneNodeHandRaised = new Promise<Video.RoomSessionMember>(
      async (resolve, _reject) => {
        await roomSession.listen({
          onMemberUpdated: (member) => {
            if (member.id === memberOne.id && member.handraised === true) {
              resolve(member)
            }
          },
        })
        await roomSession.setRaisedHand({ memberId: memberOne.id })
      }
    )

    const memberHandRaisedPromise = await Promise.all([
      memberOneNodeHandRaised,
      memberOnePageOneHandRaised,
      memberOnePageTwoHandRaised,
    ])

    console.log(
      'Hand raised by the Node SDK using room session instance',
      'Event received by all SDKs!',
      memberHandRaisedPromise
    )

    // Expect a hand raise to be true on both Node & Web SDKs for memberOne only
    memberHandRaisedPromise.forEach((obj) => {
      // @ts-expect-error
      console.log(obj.member ?? obj)
      expect(obj.handraised).toBe(true)
    })

    // memberTwo hand should not be raised
    expect(memberTwo.handraised).toBe(false)

    // Leave rooms on both pages
    await leaveRoom({ page: pageOne })
    await leaveRoom({ page: pageTwo })

    // Disconnect the client
    await client.disconnect()

    console.log(
      '===END===',
      'should raise memberOne hand using room session instance via Node SDK'
    )
  })

  test('should raise memberTwo hand using member instance via Node SDK', async ({
    browser,
  }) => {
    console.log(
      '===START===',
      'should raise memberTwo hand using member instance via Node SDK'
    )

    const { client, pageOne, pageTwo, memberOne, memberTwo, roomSession } =
      await createRoomAndJoinTwoMembers(browser)

    // Expect no hand raise from both members
    expect(memberOne.handraised).toBe(false)
    expect(memberTwo.handraised).toBe(false)

    // Expect member.updated event on pageOne via Web SDK for memberTwo
    const memberTwoPageOneHandRaised = expectHandRaiseEvent({
      page: pageOne,
      memberId: memberTwo.id,
    })

    // Expect member.updated event on pageTwo via Web SDK for memberTwo
    const memberTwoPageTwoHandRaised = expectHandRaiseEvent({
      page: pageTwo,
      memberId: memberTwo.id,
    })

    // Raise memberTwo hand using a member object via Node SDK
    const memberTwoNodeHandRaised = await new Promise<Video.RoomSessionMember>(
      async (resolve, _reject) => {
        await roomSession.listen({
          onMemberUpdated: (member) => {
            if (member.id === memberTwo.id && member.handraised === true) {
              resolve(member)
            }
          },
        })
        await memberTwo.setRaisedHand()
      }
    )

    const memberHandRaisedPromise = await Promise.all([
      memberTwoNodeHandRaised,
      memberTwoPageOneHandRaised,
      memberTwoPageTwoHandRaised,
    ])

    console.log(
      'Hand raised by the Node SDK using member instance',
      'Event received by all SDKs!',
      memberHandRaisedPromise
    )

    // Expect a hand raise to be true on both Node & Web SDKs for memberTwo only
    memberHandRaisedPromise.forEach((obj) => {
      // @ts-expect-error
      console.log(obj.member ?? obj)
      expect(obj.handraised).toBe(true)
    })

    // Leave rooms on both pages
    await leaveRoom({ page: pageOne })
    await leaveRoom({ page: pageTwo })

    // Disconnect the client
    await client.disconnect()

    console.log(
      '===END===',
      'should raise memberTwo hand using member instance via Node SDK'
    )
  })

  test('should lower memberOne hand using room session instance via Web SDK', async ({
    browser,
  }) => {
    console.log(
      '===START===',
      'should lower memberOne hand using room session instance via Web SDK'
    )

    const { client, pageOne, pageTwo, memberOne, memberTwo, roomSession } =
      await createRoomAndJoinTwoMembers(browser)

    // Expect no hand raise from both members
    expect(memberOne.handraised).toBe(false)
    expect(memberTwo.handraised).toBe(false)

    const memberHandRaisedPromise = await Promise.all([
      // Raise memberOne hand using Node SDK and expect onMemberUpdated event
      new Promise<Video.RoomSessionMember>(async (resolve, _reject) => {
        await roomSession.listen({
          onMemberUpdated: (member) => {
            if (member.id === memberOne.id && member.handraised === true) {
              resolve(member)
            }
          },
        })
        await roomSession.setRaisedHand({ memberId: memberOne.id })
      }),
      // Expect member.updated event on pageOne via Web SDK for memberOne
      expectHandRaiseEvent({
        page: pageOne,
        memberId: memberOne.id,
      }),
      // Expect member.updated event on pageTwo via Web SDK for memberOne
      expectHandRaiseEvent({
        page: pageTwo,
        memberId: memberOne.id,
      }),
    ])

    console.log(
      'Hand raised by the Node SDK using room session instance',
      'Event received by all SDKs!',
      memberHandRaisedPromise
    )
    memberHandRaisedPromise.forEach((obj) => {
      // @ts-expect-error
      console.log(obj.member ?? obj)
      expect(obj.handraised).toBe(true)
    })

    const memberHandLoweredPromise = await Promise.all([
      // Lower memberOne hand using Web SDK and expect member.updated event on pageOne
      pageOne.evaluate(
        ({ memberId }) => {
          return new Promise<InternalVideoMemberEntityUpdated>(
            async (resolve, _reject) => {
              // @ts-expect-error
              const roomSession = window._roomObj

              roomSession.on('member.updated', (room) => {
                if (
                  room.member.id === memberId &&
                  room.member.handraised === false
                ) {
                  resolve(room.member)
                }
              })

              // MemberId is not needed here since roomSession on pageOne refers to memberOne's roomSession
              await roomSession.setRaisedHand({ raised: false })
            }
          )
        },
        { memberId: memberOne.id }
      ),
      // Expect member.updated event on pageTwo via Web SDK for memberOne
      expectHandRaiseEvent({
        page: pageTwo,
        memberId: memberOne.id,
        raised: false,
      }),
      // Expect onMemberUpdated event via Node SDK for memberOne
      new Promise<Video.RoomSessionMember>(async (resolve, _reject) => {
        await roomSession.listen({
          onMemberUpdated: (member) => {
            if (member.id === memberOne.id && member.handraised === false) {
              resolve(member)
            }
          },
        })
      }),
    ])

    console.log(
      'Hand lowered by the Web SDK using room session instance',
      'Event received by all SDKs!',
      memberHandLoweredPromise
    )
    memberHandLoweredPromise.forEach((obj) => {
      // @ts-expect-error
      console.log(obj.member ?? obj)
      expect(obj.handraised).toBe(false)
    })

    // Leave rooms on both pages
    await leaveRoom({ page: pageOne })
    await leaveRoom({ page: pageTwo })

    // Disconnect the client
    await client.disconnect()

    console.log(
      '===END===',
      'should lower memberOne hand using room session instance via Web SDK'
    )
  })
})
