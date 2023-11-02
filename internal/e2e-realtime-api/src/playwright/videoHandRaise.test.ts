import { test, expect, BrowserContext, Page } from '@playwright/test'
import { Video } from '@signalwire/realtime-api'
import { createRoomAndJoinTwoMembers, expectMemberUpdated } from './videoUtils'

test.describe('Video room hand raise/lower', () => {
  let context: BrowserContext
  let pageOne: Page
  let pageTwo: Page
  let memberOne: Video.RoomSessionMember
  let memberTwo: Video.RoomSessionMember
  let roomSession: Video.RoomSession

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext()

    const data = await createRoomAndJoinTwoMembers(browser)
    pageOne = data.pageOne
    pageTwo = data.pageTwo
    memberOne = data.memberOne
    memberTwo = data.memberTwo
    roomSession = data.roomSession
  })

  test.afterAll(async () => {
    await context.close()
  })

  test('should raise member one hand using room session instance', async () => {
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
        roomSession.on('member.updated', (member) => {
          if (member.name === memberOne.name) {
            resolve(member)
          }
        })
        await roomSession.setRaisedHand({ memberId: memberOne.id })
      }
    )

    // Wait for member.updated events to be received on the Web SDK for both pages
    const memberOneUpdatedWeb = await memberOnePageOne
    await memberOnePageTwo

    // Expect a hand raise to be true on both Node & Web SDKs for memberOne only
    expect(memberOneUpdatedNode.handraised).toBe(true)
    expect(memberOneUpdatedWeb.handraised).toBe(true)
    expect(memberTwo.handraised).toBe(false)
  })

  test('should raise member two hand using member instance', async () => {
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

    // Raise memberTwo hand using a member object using Node SDK
    const memberTwoUpdatedNode = await new Promise<Video.RoomSessionMember>(
      async (resolve, _reject) => {
        roomSession.on('member.updated', (member) => {
          if (member.name === memberTwo.name) {
            resolve(member)
          }
        })
        await memberTwo.setRaisedHand()
      }
    )

    // Wait for member.updated events to be received on the Web SDK for both pages
    const memberTwoUpdatedWeb = await memberTwoPageOne
    await memberTwoPageTwo

    // Expect a hand raise to be true on both Node & Web SDKs for memberTwo only
    expect(memberTwoUpdatedNode.handraised).toBe(true)
    expect(memberTwoUpdatedWeb.handraised).toBe(true)
  })
})
