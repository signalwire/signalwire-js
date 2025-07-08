import { uuid } from '@signalwire/core'
import { test, expect, Page } from '../../fixtures'
import {
  SERVER_URL,
  createCFClient,
  dialAddress,
  expectMCUVisible,
  reloadAndReattachAddress,
} from '../../utils'
import { CallJoinedEventParams, FabricRoomSession } from '@signalwire/client'

type NamedPage = { name: string; page: Page }
const pageNames = [
  '[pageOne]',
  '[pageTwo]',
  '[pageThree]',
  '[pageFour]',
] as const

const joinAllPages = async (
  channel: 'audio' | 'video',
  createCustomPage: any,
  resource: any
) => {
  const allPages: NamedPage[] = await Promise.all(
    pageNames.map(async (name) => {
      const page = await createCustomPage({ name })
      await page.goto(SERVER_URL)
      return { name, page }
    })
  )

  const roomName = `e2e-${channel}-room-${uuid()}`
  await resource.createVideoRoomResource(roomName)
  const address = `/public/${roomName}?channel=${channel}`

  const roomSessions = []
  for (const { name, page } of allPages) {
    const roomSession =
      await test.step(`${name} create a client and join ${channel} room`, async () => {
        await createCFClient(page)
        const rs = await dialAddress(page, { address })
        expect(rs.room_session).toBeDefined()
        expect(rs.room_session.members).toBeDefined()

        if (channel === 'video') {
          await expectMCUVisible(page)
        }

        return rs
      })
    roomSessions.push(roomSession)
  }

  return { allPages, roomSessions, address }
}

const waitForMutedChange = (
  page: Page,
  memberId: string,
  field: 'audio_muted' | 'video_muted',
  expected: boolean
): Promise<[boolean, boolean]> => {
  return page.evaluate(
    ({ memberId, field, expected }) => {
      const eventSuffix = field === 'audio_muted' ? 'audioMuted' : 'videoMuted'

      // @ts-expect-error
      const roomObj: FabricRoomSession = window._roomObj

      const p1 = new Promise<boolean>((resolve) => {
        roomObj.on('member.updated', (e) => {
          if (e.member.member_id === memberId && e.member[field] === expected) {
            resolve(true)
          }
        })
      })

      const p2 = new Promise<boolean>((resolve) => {
        roomObj.on(`member.updated.${eventSuffix}`, (e) => {
          if (e.member.member_id === memberId && e.member[field] === expected) {
            resolve(true)
          }
        })
      })

      return Promise.all([p1, p2])
    },
    { memberId, field, expected }
  )
}

test.describe('CallFabric - Mute/Unmute All', () => {
  const scenarios = [
    {
      name: 'Audio-only room: audio',
      channel: 'audio',
      methods: ['audioMute', 'audioUnmute'],
      field: 'audio_muted',
    },
    {
      name: 'Video room: audio',
      channel: 'video',
      methods: ['audioMute', 'audioUnmute'],
      field: 'audio_muted',
    },
    {
      name: 'Video room: video',
      channel: 'video',
      methods: ['videoMute', 'videoUnmute'],
      field: 'video_muted',
    },
  ] as const

  for (const {
    name,
    channel,
    methods: [muteFn, unmuteFn],
    field,
  } of scenarios) {
    test(`${name} should persist mute/unmute of all members across reload and reattach`, async ({
      createCustomPage,
      resource,
    }) => {
      const { allPages, roomSessions, address } = await joinAllPages(
        channel,
        createCustomPage,
        resource
      )
      expect(roomSessions).toHaveLength(4)

      const [pageOne, pageTwo, pageThree, pageFour] = allPages.map(
        (p) => p.page
      )

      // --------------- Attach listeners on all pages ---------------
      const muteListeners = allPages.map(({ page }, i) =>
        waitForMutedChange(page, roomSessions[i].member_id, field, true)
      )

      // ----------------- Mute Audio/Video (pageOne) ----------------------
      await test.step(`[pageOne] mute all members ${channel}`, async () => {
        await pageOne.evaluate(async (fn) => {
          // @ts-expect-error
          await window._roomObj[fn]({ memberId: 'all' })
        }, muteFn)
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
        expect(roomSessionTwoAfter.call_id).toEqual(roomSessions[1].call_id)
        expect(roomSessionTwoAfter.room_session.members).toHaveLength(4)

        // Expect all members are muted
        roomSessionTwoAfter.room_session.members.forEach((member) => {
          expect(member).toBeDefined()
          expect(member[field]).toBe(true)
        })
      })

      // --------------- Attach listeners on all pages ---------------
      const unmuteListeners = allPages.map(({ page }, i) =>
        waitForMutedChange(page, roomSessions[i].member_id, field, false)
      )

      // ----------------- Unmute Audio/Video (pageThree) ---------------------
      await test.step(`[pageThree] unmute all members ${channel}`, async () => {
        await pageThree.evaluate(async (fn) => {
          // @ts-expect-error
          await window._roomObj[fn]({ memberId: 'all' })
        }, unmuteFn)
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
        expect(roomSessionFourAfter.call_id).toEqual(roomSessions[3].call_id)
        expect(roomSessionFourAfter.room_session.members).toHaveLength(4)

        // Expect all members are unmuted
        roomSessionFourAfter.room_session.members.forEach((member) => {
          expect(member).toBeDefined()
          expect(member[field]).toBe(false)
        })
      })
    })
  }
})