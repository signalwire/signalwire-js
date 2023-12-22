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
      '===Test===',
      'should raise memberOne hand using room session instance via Node SDK'
    )

    const { client, pageOne, pageTwo, memberOne, memberTwo, roomSession } =
      await createRoomAndJoinTwoMembers(browser)

    // Expect no hand raise from both members
    expect(memberOne.handraised).toBe(false)
    expect(memberTwo.handraised).toBe(false)

    // Expect member.updated event on pageOne via Web SDK for memberOne
    const memberOnePageOne = expectHandRaiseEvent({
      page: pageOne,
      memberId: memberOne.id,
    })

    // Expect member.updated event on pageTwo via Web SDK for memberOne
    const memberOnePageTwo = expectHandRaiseEvent({
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

    // Expect a hand raise to be true on both Node & Web SDKs for memberOne only
    console.log('Resolved promise')
    promise.forEach((obj) => {
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
  })

  test('should raise memberTwo hand using member instance via Node SDK', async ({
    browser,
  }) => {
    console.log(
      '===Test===',
      'should raise memberTwo hand using member instance via Node SDK'
    )

    const { client, pageOne, pageTwo, memberOne, memberTwo, roomSession } =
      await createRoomAndJoinTwoMembers(browser)

    // Expect no hand raise from both members
    expect(memberOne.handraised).toBe(false)
    expect(memberTwo.handraised).toBe(false)

    // Expect member.updated event on pageOne via Web SDK for memberTwo
    const memberTwoPageOne = expectHandRaiseEvent({
      page: pageOne,
      memberId: memberTwo.id,
    })

    // Expect member.updated event on pageTwo via Web SDK for memberTwo
    const memberTwoPageTwo = expectHandRaiseEvent({
      page: pageTwo,
      memberId: memberTwo.id,
    })

    // Raise memberTwo hand using a member object via Node SDK
    const memberTwoNode = await new Promise<Video.RoomSessionMember>(
      async (resolve, _reject) => {
        await roomSession.listen({
          onMemberUpdated: (member) => {
            if (member.name === memberTwo.name) {
              resolve(member)
            }
          },
        })
        await memberTwo.setRaisedHand()
      }
    )

    const promise = await Promise.all([
      memberTwoNode,
      memberTwoPageOne,
      memberTwoPageTwo,
    ])

    // Expect a hand raise to be true on both Node & Web SDKs for memberTwo only
    console.log('Resolved promise')
    promise.forEach((obj) => {
      // @ts-expect-error
      console.log(obj.member ?? obj)
      expect(obj.handraised).toBe(true)
    })

    // Leave rooms on both pages
    await leaveRoom({ page: pageOne })
    await leaveRoom({ page: pageTwo })

    // Disconnect the client
    await client.disconnect()
  })

  test('should lower memberOne hand using room session instance via Web SDK', async ({
    browser,
  }) => {
    console.log(
      '===Test===',
      'should lower memberOne hand using room session instance via Web SDK'
    )

    const { client, pageOne, pageTwo, memberOne, memberTwo, roomSession } =
      await createRoomAndJoinTwoMembers(browser)

    // Expect no hand raise from both members
    expect(memberOne.handraised).toBe(false)
    expect(memberTwo.handraised).toBe(false)

    const promiseHandRaised = await Promise.all([
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

    console.log('Resolved promiseHandRaised')
    promiseHandRaised.forEach((obj) => {
      // @ts-expect-error
      console.log(obj.member ?? obj)
      expect(obj.handraised).toBe(true)
    })

    const promiseHandLowered = await Promise.all([
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

    console.log('Resolved promiseHandLowered')
    promiseHandLowered.forEach((obj) => {
      // @ts-expect-error
      console.log(obj.member ?? obj)
      expect(obj.handraised).toBe(false)
    })

    // Leave rooms on both pages
    await leaveRoom({ page: pageOne })
    await leaveRoom({ page: pageTwo })

    // Disconnect the client
    await client.disconnect()
  })
})
