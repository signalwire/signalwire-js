import { uuid } from '@signalwire/core'
import { test, expect, Page } from '../../fixtures'
import {
  SERVER_URL,
  createCFClient,
  dialAddress,
  expectMCUVisible,
  reloadAndReattachAddress,
} from '../../utils'
import { CallJoinedEventParams, FabricRoomSession } from '@signalwire/js'

const waitForAudioMutedChange = (
  page: Page,
  memberId: string,
  shouldBeMuted: boolean
): Promise<[boolean, boolean]> => {
  return page.evaluate(
    ({ memberId, shouldBeMuted }) => {
      // @ts-expect-error
      const roomObj: FabricRoomSession = window._roomObj

      const memberUpdatedEvent = new Promise<boolean>((resolve) => {
        roomObj.on('member.updated', (e) => {
          if (
            e.member.member_id === memberId &&
            e.member.audio_muted === shouldBeMuted
          ) {
            resolve(true)
          }
        })
      })

      const memberAudioMutedEvent = new Promise<boolean>((resolve) => {
        roomObj.on('member.updated.audioMuted', (e) => {
          if (
            e.member.member_id === memberId &&
            e.member.audio_muted === shouldBeMuted
          ) {
            resolve(true)
          }
        })
      })

      return Promise.all([memberUpdatedEvent, memberAudioMutedEvent])
    },
    { memberId, shouldBeMuted }
  )
}

test.describe('CallFabric - Mute/Unmute All', () => {
  const scenarios = [
    { name: 'Audio-only', channel: 'audio', expectMCU: false },
    { name: 'Video', channel: 'video', expectMCU: true },
  ] as const

  for (const { name, channel, expectMCU } of scenarios) {
    test.describe(`${name} room`, () => {
      test('should mute/unmute all members audio, reload and reattach with correct states', async ({
        createCustomPage,
        resource,
      }) => {
        const pageNames = [
          '[pageOne]',
          '[pageTwo]',
          '[pageThree]',
          '[pageFour]',
        ] as const

        type NamedPage = { name: (typeof pageNames)[number]; page: Page }
        const allPages: NamedPage[] = await Promise.all(
          pageNames.map(async (name) => {
            const page = await createCustomPage({ name })
            return { name, page }
          })
        )

        await Promise.all(allPages.map(({ page }) => page.goto(SERVER_URL)))

        const roomName = `e2e-${channel}-room-${uuid()}`
        await resource.createVideoRoomResource(roomName)
        const address = `/public/${roomName}?channel=${channel}`

        const allRoomSessions: CallJoinedEventParams[] = []
        for (const { name, page } of allPages) {
          const roomSession =
            await test.step(`${name} create client and join a room`, async () => {
              await createCFClient(page)

              const roomSession: CallJoinedEventParams = await dialAddress(
                page,
                {
                  address,
                }
              )

              expect(roomSession.room_session).toBeDefined()
              expect(roomSession.room_session.members).toBeDefined()

              if (expectMCU) await expectMCUVisible(page)

              return roomSession
            })
          allRoomSessions.push(roomSession)
        }
        expect(allRoomSessions).toHaveLength(4)

        const [
          { page: pageOne },
          { page: pageTwo },
          { page: pageThree },
          { page: pageFour },
        ] = allPages

        // --------------- Attach listeners on all pages ---------------
        const muteListeners = allPages.map(({ page }, i) =>
          waitForAudioMutedChange(page, allRoomSessions[i].member_id, true)
        )

        // ----------------- Mute Audio (pageOne) ----------------------
        await test.step('[pageOne] mute all members audio', async () => {
          await pageOne.evaluate(async () => {
            // @ts-expect-error
            const roomObj: FabricRoomSession = window._roomObj
            await roomObj.audioMute({ memberId: 'all' })
          })
        })

        await test.step('all pages should receive the memeber.updated events for mute', async () => {
          await Promise.all(muteListeners)
        })

        // --------------- Reload and Reattach (pageTwo) ----------------
        const roomSessionTwoAfter: CallJoinedEventParams =
          await test.step('[pageTwo] reload page and reattach', async () => {
            return reloadAndReattachAddress(pageTwo, { address })
          })

        await test.step('[pageTwo] assert room state', async () => {
          expect(roomSessionTwoAfter.room_session).toBeDefined()
          expect(roomSessionTwoAfter.call_id).toEqual(
            allRoomSessions[1].call_id
          )
          expect(roomSessionTwoAfter.room_session.members).toHaveLength(4)

          // Expect all members are muted
          roomSessionTwoAfter.room_session.members.forEach((member) => {
            expect(member).toBeDefined()
            expect(member.audio_muted).toBe(true)
          })
        })

        // --------------- Attach listeners on all pages ---------------
        const unmuteListeners = allPages.map(({ page }, i) =>
          waitForAudioMutedChange(page, allRoomSessions[i].member_id, false)
        )

        // ----------------- Unmute Audio (pageThree) ---------------------
        await test.step('[pageThree] unmute all members audio', async () => {
          await pageThree.evaluate(async () => {
            // @ts-expect-error
            const roomObj: FabricRoomSession = window._roomObj
            await roomObj.audioUnmute({ memberId: 'all' })
          })
        })

        await test.step('all pages should receive the memeber.updated events for unmute', async () => {
          await Promise.all(unmuteListeners)
        })

        // --------------- Reload and Reattach (pageFour) ----------------
        const roomSessionFourAfter: CallJoinedEventParams =
          await test.step('[pageFour] reload page and reattach', async () => {
            return reloadAndReattachAddress(pageFour, { address })
          })

        await test.step('[pageFour] assert room state', async () => {
          expect(roomSessionFourAfter.room_session).toBeDefined()
          expect(roomSessionFourAfter.call_id).toEqual(
            allRoomSessions[3].call_id
          )
          expect(roomSessionFourAfter.room_session.members).toHaveLength(4)

          // Expect all members are unmuted
          roomSessionFourAfter.room_session.members.forEach((member) => {
            expect(member).toBeDefined()
            expect(member.audio_muted).toBe(false)
          })
        })
      })
    })
  }
})
