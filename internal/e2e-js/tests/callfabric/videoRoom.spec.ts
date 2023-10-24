import { Video } from '@signalwire/js'
import { test, expect } from '../../fixtures'
import {
  SERVER_URL,
  createSWClient,
  expectLayoutChanged,
  expectMCUVisible,
  setLayoutOnPage,
} from '../../utils'

test.describe('CallFabric VideoRoom', () => {
  test('should handle joining a room, perform actions and then leave the room', async ({
    createCustomPage,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = 'cf-e2e-test-room'

    await createSWClient(page)

    // Dial an address and join a video room
    const roomSession = await page.evaluate(
      async ({ roomName }) => {
        return new Promise<any>(async (resolve, _reject) => {
          // @ts-expect-error
          const client = window._client

          const call = await client.dial({
            to: `/public/${roomName}`,
            logLevel: 'debug',
            debug: { logWsTraffic: true },
            nodeId: undefined,
          })

          call.on('room.joined', resolve)

          // @ts-expect-error
          window._roomObj = call

          await call.start()
        })
      },
      { roomName }
    )

    expect(roomSession.room).toBeDefined()
    expect(roomSession.room_session).toBeDefined()
    expect(
      roomSession.room.members.some(
        (member: any) => member.id === roomSession.member_id
      )
    ).toBeTruthy()
    expect(roomSession.room_session.name).toBe(roomName)
    expect(roomSession.room.name).toBe(roomName)

    await expectMCUVisible(page)

    // --------------- Muting Audio (self) ---------------
    await page.evaluate(
      async ({ roomSession }) => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj

        const memberUpdatedMuted = new Promise((resolve) => {
          roomObj.on('member.updated', (params) => {
            if (
              params.member.id === roomSession.member_id &&
              params.member.updated.includes('audio_muted') &&
              params.member.audio_muted === true
            ) {
              resolve(true)
            }
          })
        })

        const memberUpdatedUnmuted = new Promise((resolve) => {
          roomObj.on('member.updated', (params) => {
            if (
              params.member.id === roomSession.member_id &&
              params.member.updated.includes('audio_muted') &&
              params.member.audio_muted === false
            ) {
              resolve(true)
            }
          })
        })

        await roomObj.audioMute()
        await roomObj.audioUnmute()

        return Promise.all([memberUpdatedMuted, memberUpdatedUnmuted])
      },
      { roomSession }
    )

    // --------------- Muting Video (self) ---------------
    await page.evaluate(
      async ({ roomSession }) => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj

        const memberUpdatedMuted = new Promise((resolve) => {
          roomObj.on('member.updated', (params) => {
            if (
              params.member.id === roomSession.member_id &&
              params.member.updated.includes('video_muted') &&
              params.member.updated.includes('visible') &&
              params.member.video_muted === true &&
              params.member.visible === false
            ) {
              resolve(true)
            }
          })
        })

        const memberUpdatedUnmuted = new Promise((resolve) => {
          roomObj.on('member.updated', (params) => {
            if (
              params.member.id === roomSession.member_id &&
              params.member.updated.includes('video_muted') &&
              params.member.updated.includes('visible') &&
              params.member.video_muted === false &&
              params.member.visible === true
            ) {
              resolve(true)
            }
          })
        })

        await roomObj.videoMute()
        await roomObj.videoUnmute()

        return Promise.all([memberUpdatedMuted, memberUpdatedUnmuted])
      },
      { roomSession }
    )

    // --------------- Get Room Meta ---------------
    const expectRoomMeta = async (expected: any) => {
      const currentMeta: any = await page.evaluate(() => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj
        return roomObj.getMeta()
      })
      expect(currentMeta.meta).toStrictEqual(expected)
    }
    await expectRoomMeta({})

    // --------------- Set Room Meta ---------------
    const meta = { something: 'xx-yy-zzz' }
    await page.evaluate(
      async ({ meta }) => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj

        await roomObj.setMeta(meta)
      },
      {
        meta,
      }
    )
    await expectRoomMeta(meta)

    // --------------- Update Room Meta ---------------
    const metaUpdate = { updatedKey: 'ii-oo' }
    await page.evaluate(
      async ({ meta }) => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj

        await roomObj.updateMeta(meta)
      },
      {
        meta: metaUpdate,
      }
    )
    await expectRoomMeta({ ...meta, ...metaUpdate })

    // --------------- Delete Room Meta ---------------
    const metaDelete = ['updatedKey']
    await page.evaluate(
      async ({ keys }) => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj

        await roomObj.deleteMeta(keys)
      },
      {
        keys: metaDelete,
      }
    )
    await expectRoomMeta(meta)

    const layoutName = '3x3'
    // --------------- Expect layout to change ---------------
    const layoutChangedPromise = expectLayoutChanged(page, layoutName)
    // --------------- Set layout ---------------
    await setLayoutOnPage(page, layoutName)
    expect(await layoutChangedPromise).toBe(true)
  })
})
