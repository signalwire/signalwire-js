import { Video } from '@signalwire/js'
import { test, expect } from '../../fixtures'
import {
  SERVER_URL,
  createCFClient,
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

    await createCFClient(page)

    // Dial an address and join a video room
    const roomSession = await page.evaluate(
      async ({ roomName }) => {
        return new Promise<any>(async (resolve, _reject) => {
          // @ts-expect-error
          const client = window._client

          const call = await client.dial({
            to: `/public/${roomName}`,
            rootElement: document.getElementById('rootElement'),
          })

          call.on('room.joined', resolve)
          call.on('room.updated', () => {})

          // @ts-expect-error
          window._roomObj = call

          await call.start()
        })
      },
      { roomName }
    )

    expect(roomSession.room_session).toBeDefined()
    expect(
      roomSession.room_session.members.some(
        (member: any) => member.member_id === roomSession.member_id
      )
    ).toBeTruthy()

    // FIXME:
    // console.log('>> roomSession.room_session', roomSession)
    // expect(roomSession.room_session.name.startsWith(roomName)).toBeTruthy()
    // expect(roomSession.room.name.startsWith(roomName)).toBeTruthy()
    // expect(roomSession.room_session.display_name).toBe(roomName)

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

    // --------------- Set layout ---------------
    const layoutName = '3x3'
    const layoutChangedPromise = expectLayoutChanged(page, layoutName)
    await setLayoutOnPage(page, layoutName)
    expect(await layoutChangedPromise).toBe(true)

    /**
     * FIXME: The following APIs are not yet supported by the Call Fabric SDK
     */

    // // --------------- Get Room Meta ---------------
    // const currentMeta: any = await page.evaluate(() => {
    //   // @ts-expect-error
    //   const roomObj: Video.RoomSession = window._roomObj
    //   return roomObj.getMeta()
    // })
    // expect(currentMeta.meta).toStrictEqual({})

    // // --------------- Set Room Meta ---------------
    // const meta = { something: 'xx-yy-zzz' }
    // const setMeta = await page.evaluate(
    //   ({ meta }) => {
    //     return new Promise(async (resolve, _reject) => {
    //       // @ts-expect-error
    //       const roomObj: Video.RoomSession = window._roomObj

    //       roomObj.on('room.updated', (room) => {
    //         if (room.room_session.updated?.includes('meta')) {
    //           resolve(room.room_session.meta)
    //         }
    //       })

    //       await roomObj.setMeta(meta)
    //     })
    //   },
    //   {
    //     meta,
    //   }
    // )
    // expect(
    //   setMeta,
    //   "Set meta should be: { something: 'xx-yy-zzz' }"
    // ).toStrictEqual(meta)

    // // --------------- Update Room Meta ---------------
    // const metaUpdate = { updatedKey: 'ii-oo' }
    // const updatedMeta = await page.evaluate(
    //   ({ meta }) => {
    //     return new Promise(async (resolve, _reject) => {
    //       // @ts-expect-error
    //       const roomObj: Video.RoomSession = window._roomObj

    //       roomObj.on('room.updated', (room) => {
    //         if (room.room_session.updated?.includes('meta')) {
    //           resolve(room.room_session.meta)
    //         }
    //       })

    //       await roomObj.updateMeta(meta)
    //     })
    //   },
    //   {
    //     meta: metaUpdate,
    //   }
    // )
    // expect(
    //   updatedMeta,
    //   "Updated meta should be: { something: 'xx-yy-zzz', updatedKey: 'ii-oo' }"
    // ).toStrictEqual({ ...meta, ...metaUpdate })

    // // --------------- Delete Room Meta ---------------
    // const metaDelete = ['updatedKey']
    // const deletedMeta = await page.evaluate(
    //   ({ keys }) => {
    //     return new Promise(async (resolve, _reject) => {
    //       // @ts-expect-error
    //       const roomObj: Video.RoomSession = window._roomObj

    //       roomObj.on('room.updated', (room) => {
    //         if (room.room_session.updated?.includes('meta')) {
    //           resolve(room.room_session.meta)
    //         }
    //       })

    //       await roomObj.deleteMeta(keys)
    //     })
    //   },
    //   {
    //     keys: metaDelete,
    //   }
    // )
    // expect(
    //   deletedMeta,
    //   "Deleted meta should be: { something: 'xx-yy-zzz' }"
    // ).toStrictEqual(meta)
  })

  test('should fail on invalid address', async ({ createCustomPage }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    await createCFClient(page)

    // Dial an address and join a video room
    const roomSession = await page.evaluate(async () => {
      try {
        // @ts-expect-error
        const client = window._client

        const call = await client.dial({
          to: `/public/invalid-address`,
          rootElement: document.getElementById('rootElement'),
        })

        // @ts-expect-error
        window._roomObj = call

        await call.start()

        return { success: true }
      } catch (error) {
        return { success: false, error }
      }
    })

    expect(roomSession.success).toBe(false)
  })
})
