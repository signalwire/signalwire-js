import { uuid } from '@signalwire/core'
import { CallSession, CallJoinedEventParams } from '@signalwire/client'
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
    const callSession: CallJoinedEventParams = await dialAddress(page, {
      address: `/public/${roomName}?channel=video`,
    })

    expect(callSession.room_session).toBeDefined()
    expect(callSession.room_session.name).toBeDefined()
    expect(callSession.room_session.display_name).toBeDefined()
    expect(
      callSession.room_session.members.some(
        (member) => member.member_id === callSession.member_id
      )
    ).toBeTruthy()

    await expectMCUVisible(page)

    // --------------- Muting Audio (self) ---------------
    await page.evaluate(
      async ({ callSession }) => {
        // @ts-expect-error
        const callObj: CallSession = window._callObj

        const memberUpdatedMuted = new Promise((resolve) => {
          const memberUpdatedEvent = new Promise((res) => {
            callObj.on('member.updated', (params) => {
              if (
                params.member.member_id === callSession.member_id &&
                params.member.updated.includes('audio_muted') &&
                params.member.audio_muted === true
              ) {
                res(true)
              }
            })
          })
          const memberUpdatedMutedEvent = new Promise((res) => {
            callObj.on('member.updated.audioMuted', (params) => {
              if (
                params.member.member_id === callSession.member_id &&
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
            callObj.on('member.updated', (params) => {
              if (
                params.member.member_id === callSession.member_id &&
                params.member.updated.includes('audio_muted') &&
                params.member.audio_muted === false
              ) {
                res(true)
              }
            })
          })
          const memberUpdatedMutedEvent = new Promise((res) => {
            callObj.on('member.updated.audioMuted', (params) => {
              if (
                params.member.member_id === callSession.member_id &&
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

        await callObj.audioMute()
        await callObj.audioUnmute()

        return Promise.all([memberUpdatedMuted, memberUpdatedUnmuted])
      },
      { callSession }
    )

    // --------------- Muting Video (self) ---------------
    await page.evaluate(
      async ({ callSession }) => {
        // @ts-expect-error
        const callObj: CallSession = window._callObj

        const memberUpdatedMuted = new Promise((resolve) => {
          const memberUpdatedEvent = new Promise((res) => {
            callObj.on('member.updated', (params) => {
              if (
                params.member.member_id === callSession.member_id &&
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
            callObj.on('member.updated.videoMuted', (params) => {
              if (
                params.member.member_id === callSession.member_id &&
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
            callObj.on('member.updated', (params) => {
              if (
                params.member.member_id === callSession.member_id &&
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
            callObj.on('member.updated.videoMuted', (params) => {
              if (
                params.member.member_id === callSession.member_id &&
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

        await callObj.videoMute()
        await callObj.videoUnmute()

        return Promise.all([memberUpdatedMuted, memberUpdatedUnmuted])
      },
      { callSession }
    )

    // --------------- Screenshare ---------------
    await page.evaluate(async () => {
      // @ts-expect-error
      const callObj: CallSession = window._callObj

      let screenMemberId: string | undefined

      const screenJoined = new Promise((resolve) => {
        callObj.on('member.joined', (params) => {
          if (params.member.type === 'screen') {
            screenMemberId = params.member.member_id
            resolve(true)
          }
        })
      })

      const screenLeft = new Promise((resolve) => {
        callObj.on('member.left', (params) => {
          if (
            params.member.type === 'screen' &&
            params.member.member_id === screenMemberId
          ) {
            resolve(true)
          }
        })
      })

      const screenShareObj = await callObj.startScreenShare({
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
      async ({ callSession }) => {
        // @ts-expect-error
        const callObj: CallSession = window._callObj

        const roomUpdatedLocked = new Promise((resolve) => {
          callObj.on('room.updated', (params) => {
            if (params.room_session.locked === true) {
              resolve(true)
            }
          })
        })

        const roomUpdatedUnlocked = new Promise((resolve) => {
          callObj.on('room.updated', (params) => {
            if (params.room_session.locked === false) {
              resolve(true)
            }
          })
        })

        await callObj.lock()
        await roomUpdatedLocked

        await callObj.unlock()
        await roomUpdatedUnlocked
      },
      { callSession }
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
    //   const callObj: Video.RoomSession = window._callObj
    //   return callObj.getMeta()
    // })
    // expect(currentMeta.meta).toStrictEqual({})

    // // --------------- Set Room Meta ---------------
    // const meta = { something: 'xx-yy-zzz' }
    // const setMeta = await page.evaluate(
    //   ({ meta }) => {
    //     return new Promise(async (resolve, _reject) => {
    //       // @ts-expect-error
    //       const callObj: Video.RoomSession = window._callObj

    //       callObj.on('room.updated', (room) => {
    //         if (room.room_session.updated?.includes('meta')) {
    //           resolve(room.room_session.meta)
    //         }
    //       })

    //       await callObj.setMeta(meta)
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
    //       const callObj: Video.RoomSession = window._callObj

    //       callObj.on('room.updated', (room) => {
    //         if (room.room_session.updated?.includes('meta')) {
    //           resolve(room.room_session.meta)
    //         }
    //       })

    //       await callObj.updateMeta(meta)
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
    //       const callObj: Video.RoomSession = window._callObj

    //       callObj.on('room.updated', (room) => {
    //         if (room.room_session.updated?.includes('meta')) {
    //           resolve(room.room_session.meta)
    //         }
    //       })

    //       await callObj.deleteMeta(keys)
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
    const callSession = await page.evaluate(async () => {
      try {
        const client = window._client!

        const call = await client.dial({
          to: `/public/invalid-address?channel=video`,
          rootElement: document.getElementById('rootElement'),
        })

        // @ts-expect-error
        window._callObj = call

        await call.start()

        return { success: true }
      } catch (error) {
        return { success: false, error }
      }
    })

    expect(callSession.success).toBe(false)
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
    const callSession = await dialAddress(page, {
      address: `/public/${roomName}?channel=audio`,
    })

    expect(callSession.room_session).toBeDefined()
    expect(
      callSession.room_session.members.some(
        (member: any) => member.member_id === callSession.member_id
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
