import { uuid } from '@signalwire/core'
import { FabricRoomSession, CallJoinedEventParams } from '@signalwire/js'
import { test, expect } from '../../fixtures'
import {
  SERVER_URL,
  createCFClient,
  dialAddress,
  expectLayoutChanged,
  expectMCUVisible,
  getStats,
  setLayoutOnPage,
} from '../../utils'

test.describe('CallFabric VideoRoom', () => {
  test('should handle joining a room, perform actions and then leave the room', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e-video-room_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page)

    // Dial an address and join a video room
    const roomSession: CallJoinedEventParams = await dialAddress(page, {
      address: `/public/${roomName}?channel=video`,
    })

    expect(roomSession.room_session).toBeDefined()
    expect(roomSession.room_session.name).toBeDefined()
    expect(roomSession.room_session.display_name).toBeDefined()
    expect(
      roomSession.room_session.members.some(
        (member) => member.member_id === roomSession.member_id
      )
    ).toBeTruthy()

    await expectMCUVisible(page)

    // --------------- Muting Audio (self) ---------------
    await page.evaluate(
      async ({ roomSession }) => {
        // @ts-expect-error
        const roomObj: FabricRoomSession = window._roomObj

        const memberUpdatedMuted = new Promise((resolve) => {
          const memberUpdatedEvent = new Promise((res) => {
            roomObj.on('member.updated', (params) => {
              if (
                params.member.member_id === roomSession.member_id &&
                params.member.updated.includes('audio_muted') &&
                params.member.audio_muted === true
              ) {
                res(true)
              }
            })
          })
          const memberUpdatedMutedEvent = new Promise((res) => {
            roomObj.on('member.updated.audioMuted', (params) => {
              if (
                params.member.member_id === roomSession.member_id &&
                params.member.audio_muted === true
              ) {
                res(true)
              }
            })
          })

          Promise.all([memberUpdatedEvent, memberUpdatedMutedEvent]).then(
            resolve
          )
        })

        const memberUpdatedUnmuted = new Promise((resolve) => {
          const memberUpdatedEvent = new Promise((res) => {
            roomObj.on('member.updated', (params) => {
              if (
                params.member.member_id === roomSession.member_id &&
                params.member.updated.includes('audio_muted') &&
                params.member.audio_muted === false
              ) {
                res(true)
              }
            })
          })
          const memberUpdatedMutedEvent = new Promise((res) => {
            roomObj.on('member.updated.audioMuted', (params) => {
              if (
                params.member.member_id === roomSession.member_id &&
                params.member.audio_muted === false
              ) {
                res(true)
              }
            })
          })

          Promise.all([memberUpdatedEvent, memberUpdatedMutedEvent]).then(
            resolve
          )
        })

        await roomObj.audioMute()
        await roomObj.audioUnmute()

        return Promise.all([memberUpdatedMuted, memberUpdatedUnmuted])
      },
      { roomSession }
    )

    // // --------------- Muting Video (self) ---------------
    await page.evaluate(
      async ({ roomSession }) => {
        // @ts-expect-error
        const roomObj: FabricRoomSession = window._roomObj

        const memberUpdatedMuted = new Promise((resolve) => {
          const memberUpdatedEvent = new Promise((res) => {
            roomObj.on('member.updated', (params) => {
              if (
                params.member.member_id === roomSession.member_id &&
                params.member.updated.includes('video_muted') &&
                params.member.updated.includes('visible') &&
                params.member.video_muted === true &&
                params.member.visible === false
              ) {
                res(true)
              }
            })
          })
          const memberUpdatedMutedEvent = new Promise((res) => {
            roomObj.on('member.updated.videoMuted', (params) => {
              if (
                params.member.member_id === roomSession.member_id &&
                params.member.video_muted === true &&
                params.member.visible === false
              ) {
                res(true)
              }
            })
          })

          Promise.all([memberUpdatedEvent, memberUpdatedMutedEvent]).then(
            resolve
          )
        })

        const memberUpdatedUnmuted = new Promise((resolve) => {
          const memberUpdatedEvent = new Promise((res) => {
            roomObj.on('member.updated', (params) => {
              if (
                params.member.member_id === roomSession.member_id &&
                params.member.updated.includes('video_muted') &&
                params.member.updated.includes('visible') &&
                params.member.video_muted === false &&
                params.member.visible === true
              ) {
                res(true)
              }
            })
          })
          const memberUpdatedMutedEvent = new Promise((res) => {
            roomObj.on('member.updated.videoMuted', (params) => {
              if (
                params.member.member_id === roomSession.member_id &&
                params.member.video_muted === false &&
                params.member.visible === true
              ) {
                res(true)
              }
            })
          })

          Promise.all([memberUpdatedEvent, memberUpdatedMutedEvent]).then(
            resolve
          )
        })

        await roomObj.videoMute()
        await roomObj.videoUnmute()

        return Promise.all([memberUpdatedMuted, memberUpdatedUnmuted])
      },
      { roomSession }
    )

    // --------------- Screenshare ---------------
    await page.evaluate(async () => {
      // @ts-expect-error
      const roomObj: FabricRoomSession = window._roomObj

      let screenMemberId: string | undefined

      const screenJoined = new Promise((resolve) => {
        roomObj.on('member.joined', (params) => {
          if (params.member.type === 'screen') {
            screenMemberId = params.member.member_id
            resolve(true)
          }
        })
      })

      const screenLeft = new Promise((resolve) => {
        roomObj.on('member.left', (params) => {
          if (
            params.member.type === 'screen' &&
            params.member.member_id === screenMemberId
          ) {
            resolve(true)
          }
        })
      })

      const screenShareObj = await roomObj.startScreenShare({
        audio: true,
        video: true,
      })

      const screenShareIdCheckPromise = new Promise((resolve) => {
        resolve(screenMemberId === screenShareObj.memberId)
      })

      const screenRoomLeft = new Promise((resolve) => {
        screenShareObj.on('room.left', () => resolve(true))
      })

      await new Promise((r) => setTimeout(r, 2000))

      await screenShareObj.leave()

      return Promise.all([
        screenJoined,
        screenLeft,
        screenRoomLeft,
        screenShareIdCheckPromise,
      ])
    })

    // --------------- Room lock/unlock ---------------
    await page.evaluate(
      // @ts-expect-error
      async ({ roomSession }) => {
        // @ts-expect-error
        const roomObj: FabricRoomSession = window._roomObj

        const roomUpdatedLocked = new Promise((resolve) => {
          roomObj.on('room.updated', (params) => {
            if (params.room_session.locked === true) {
              resolve(true)
            }
          })
        })

        const roomUpdatedUnlocked = new Promise((resolve) => {
          roomObj.on('room.updated', (params) => {
            if (params.room_session.locked === false) {
              resolve(true)
            }
          })
        })

        await roomObj.lock()
        await roomUpdatedLocked

        await roomObj.unlock()
        await roomUpdatedUnlocked
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
        const client = window._client!

        const call = await client.dial({
          to: `/public/invalid-address?channel=video`,
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

  test('should handle joining a room with audio channel only', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e-video-room_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page)

    // Dial an address with audio only channel
    const roomSession = await dialAddress(page, {
      address: `/public/${roomName}?channel=audio`,
    })

    expect(roomSession.room_session).toBeDefined()
    expect(
      roomSession.room_session.members.some(
        (member: any) => member.member_id === roomSession.member_id
      )
    ).toBeTruthy()

    // There should be no inbound/outbound video
    const stats = await getStats(page)
    expect(stats.outboundRTP.video?.packetsSent).toBe(0)
    expect(stats.inboundRTP.video?.packetsReceived).toBe(0)

    // There should be audio packets
    expect(stats.inboundRTP.audio?.packetsReceived).toBeGreaterThan(0)

    // There should be no MCU either
    const videoElement = await page.$('div[id^="sw-sdk-"] > video')
    expect(videoElement).toBeNull()
  })
})
