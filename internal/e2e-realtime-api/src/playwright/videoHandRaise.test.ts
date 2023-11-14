import { test, expect, BrowserContext, Page } from '@playwright/test'
import { Video } from '@signalwire/realtime-api'
import { createRoomAndJoinTwoMembers, expectMemberUpdated } from './videoUtils'

test.describe('Video room hand raise/lower', () => {
  let pageOne: Page
  let pageTwo: Page
  let memberOne: Video.RoomSessionMember
  let memberTwo: Video.RoomSessionMember
  let roomSession: Video.RoomSession

  test.beforeAll(async ({ browser }) => {
    const data = await createRoomAndJoinTwoMembers(browser)
    pageOne = data.pageOne
    pageTwo = data.pageTwo
    memberOne = data.memberOne
    memberTwo = data.memberTwo
    roomSession = data.roomSession
  })

  test('should raise memberOne hand using room session instance via Node SDK', async () => {
    // Expect no hand raise from both members
    expect(memberOne.handraised).toBe(false)
    expect(memberTwo.handraised).toBe(false)

    // Expect member.updated event on pageOne via Web SDK for memberOne
    const memberOnePageOne = expectMemberUpdated({
      page: pageOne,
      memberName: memberOne.name,
    })

    // Expect member.updated event on pageTwo via Web SDK for memberOne
    const memberOnePageTwo = expectMemberUpdated({
      page: pageTwo,
      memberName: memberOne.name,
    })

    // Raise a hand of memberOne using Node SDK
    const memberOneUpdatedNode = await new Promise<Video.RoomSessionMember>(
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

    // Wait for member.updated events to be received on the Web SDK for both pages
    const memberOnePageOneUpdatedWeb = await memberOnePageOne
    const memberOnePageTwoUpdatedWeb = await memberOnePageTwo

    // Expect a hand raise to be true on both Node & Web SDKs for memberOne only
    expect(memberOneUpdatedNode.handraised).toBe(true)
    expect(memberOnePageOneUpdatedWeb.handraised).toBe(true)
    expect(memberOnePageTwoUpdatedWeb.handraised).toBe(true)

    expect(memberTwo.handraised).toBe(false)
  })

  test('should raise memberTwo hand using member instance via Node SDK', async () => {
    // Expect member.updated event on pageOne via Web SDK for memberTwo
    const memberTwoPageOne = expectMemberUpdated({
      page: pageOne,
      memberName: memberTwo.name,
    })

    // Expect member.updated event on pageTwo via Web SDK for memberTwo
    const memberTwoPageTwo = expectMemberUpdated({
      page: pageTwo,
      memberName: memberTwo.name,
    })

    // Raise memberTwo hand using a member object via Node SDK
    const memberTwoUpdatedNode = await new Promise<Video.RoomSessionMember>(
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

    // Wait for member.updated events to be received on the Web SDK for both pages
    const memberTwoPageOneUpdatedWeb = await memberTwoPageOne
    const memberTwoPageTwoUpdatedWeb = await memberTwoPageTwo

    // Expect a hand raise to be true on both Node & Web SDKs for memberTwo only
    expect(memberTwoUpdatedNode.handraised).toBe(true)
    expect(memberTwoPageOneUpdatedWeb.handraised).toBe(true)
    expect(memberTwoPageTwoUpdatedWeb.handraised).toBe(true)
  })

  test('should lower memberOne hand using room session instance via Web SDK', async () => {
    // Expect member.updated event on pageOne via Web SDK for memberOne
    const memberOnePageOne = expectMemberUpdated({
      page: pageOne,
      memberName: memberOne.name,
    })

    // Expect member.updated event on pageTwo via Web SDK for memberOne
    const memberOnePageTwo = expectMemberUpdated({
      page: pageTwo,
      memberName: memberOne.name,
    })

    // Expect member.updated event via Node SDK for memberOne
    const memberOneNode = new Promise<Video.RoomSessionMember>(
      async (resolve, _reject) => {
        await roomSession.listen({
          onMemberUpdated: (member) => {
            if (member.name === memberOne.name) {
              resolve(member)
            }
          },
        })
      }
    )

    await pageOne.evaluate(async () => {
      // @ts-expect-error
      const roomSession = window._roomObj

      // MemberId is not needed here since roomSession on pageOne refers to memberOne's roomSession
      await roomSession.setRaisedHand({ raised: false })
    })

    // Wait for member.updated events to be received on the Web SDK for both pages
    const memberOnePageOneUpdatedWeb = await memberOnePageOne
    const memberOnePageTwoUpdatedWeb = await memberOnePageTwo

    // Wait for member.updated events to be received on the Node SDK
    const memberOneUpdatedNode = await memberOneNode

    // Expect a hand raise to be false on both Node & Web SDKs for memberOne only
    expect(memberOneUpdatedNode.handraised).toBe(false)
    expect(memberOnePageOneUpdatedWeb.handraised).toBe(false)
    expect(memberOnePageTwoUpdatedWeb.handraised).toBe(false)
  })
})
