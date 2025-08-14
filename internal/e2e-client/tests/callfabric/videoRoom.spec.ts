import { uuid } from '@signalwire/core'
import { CallJoinedEventParams, CallSession } from '@signalwire/client'
import { test, expect, CustomPage } from '../../fixtures'
import {
  SERVER_URL,
  createCFClient,
  dialAddress,
  expectLayoutChanged,
  expectMCUVisible,
  expectToPass,
  getStats,
  setLayoutOnPage,
  waitForFunction,
} from '../../utils'
import { PageWithWsInspector } from 'playwrigth-ws-inspector'
import { JSHandle } from '@playwright/test'

test.describe('CallFabric VideoRoom', () => {
  test('should handle joining a room, perform actions and then leave the room', async ({
    createCustomPage,
    resource,
  }) => {
    let callObj: JSHandle<CallSession> = {} as JSHandle<CallSession>
    let callSession: CallJoinedEventParams = {} as CallJoinedEventParams
    let page: PageWithWsInspector<CustomPage> =
      {} as PageWithWsInspector<CustomPage>

    await test.step('setup page and call', async () => {
      page = await createCustomPage({ name: '[page]' })
      await page.goto(SERVER_URL)

      const roomName = `e2e_${uuid()}`
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

      // --------------- Call Object ------------------------
      callObj = await waitForFunction(page, () => {
        if (window._callObj) {
          return window._callObj
        } else {
          throw new Error('Call object not found')
        }
      })
    })

    // --------------- Muting Audio (self) ---------------
    await test.step('muting audio (self)', async () => {
      const memberUpdatedMutedEvent = expectToPass(
        async () => {
          const result = await page.evaluate(
            (params) => {
              return new Promise<boolean>((resolve) => {
                params.callObj.on('member.updated.audioMuted', ({ member }) => {
                  if (
                    member.member_id === params.callSession.member_id &&
                    member.audio_muted === true
                  ) {
                    resolve(true)
                  }
                })
              })
            },
            { callObj, callSession }
          )
          expect(result, 'expect member updated muted event').toBe(true)
        },
        { message: 'member updated muted event' }
      )

      const memberUpdatedMuted = expectToPass(
        async () => {
          const result = await page.evaluate(
            (params) => {
              return new Promise<boolean>((resolve) => {
                params.callObj.on('member.updated', ({ member }) => {
                  if (
                    member.member_id === params.callSession.member_id &&
                    member.updated.includes('audio_muted') &&
                    member.audio_muted === true
                  ) {
                    resolve(true)
                  }
                })
              })
            },
            { callObj, callSession }
          )
          expect(result, 'expect member updated muted').toBe(true)
        },
        { message: 'member updated muted' }
      )

      const audioMuteSelf = expectToPass(
        async () => {
          const result = await page.evaluate(
            async (params) => {
              await params.callObj.audioMute()
              return true
            },
            { callObj }
          )
          expect(result, 'expect audio mute self').toBe(true)
        },
        { message: 'audio mute self' }
      )

      await audioMuteSelf
      await memberUpdatedMuted
      await memberUpdatedMutedEvent
    })
    // --------------- Unmuting Audio (self) ---------------
    await test.step('unmuting audio (self)', async () => {
      const memberUpdatedUnmutedEvent = expectToPass(
        async () => {
          const result = await page.evaluate(
            async (params) => {
              return new Promise<boolean>((resolve) => {
                params.callObj.on('member.updated.audioMuted', ({ member }) => {
                  if (
                    member.member_id === params.callSession.member_id &&
                    member.audio_muted === false
                  ) {
                    resolve(true)
                  }
                })
              })
            },
            { callObj, callSession }
          )
          expect(result, 'expect member updated unmuted event').toBe(true)
        },
        { message: 'member updated unmuted event' }
      )

      const memberUpdatedUnmuted = expectToPass(
        async () => {
          const result = await page.evaluate(
            async (params) => {
              return new Promise<boolean>((resolve) => {
                params.callObj.on('member.updated', ({ member }) => {
                  if (
                    member.member_id === params.callSession.member_id &&
                    member.updated.includes('audio_muted') &&
                    member.audio_muted === false
                  ) {
                    resolve(true)
                  }
                })
              })
            },
            { callObj, callSession }
          )
          expect(result, 'expect member updated unmuted').toBe(true)
        },
        { message: 'member updated unmuted' }
      )

      const audioUnmuteSelf = expectToPass(
        async () => {
          const result = await page.evaluate(
            async (params) => {
              await params.callObj.audioUnmute()
              return true
            },
            { callObj }
          )
          expect(result, 'expect audio unmute self').toBe(true)
        },
        { message: 'audio unmute self' }
      )
      await audioUnmuteSelf
      await memberUpdatedUnmuted
      await memberUpdatedUnmutedEvent
    })
    // --------------- Muting Video (self) ---------------
    await test.step('muting video (self)', async () => {
      const memberVideoUpdatedMutedEvent = expectToPass(
        async () => {
          const result = await page.evaluate(
            (params) => {
              return new Promise<boolean>((resolve) => {
                params.callObj.on('member.updated.videoMuted', ({ member }) => {
                  if (
                    member.member_id === params.callSession.member_id &&
                    member.video_muted === true &&
                    member.visible === false
                  ) {
                    resolve(true)
                  }
                })
              })
            },
            { callObj, callSession }
          )
          expect(result, 'expect member video updated muted event').toBe(true)
        },
        { message: 'member video updated muted event' }
      )

      const memberVideoUpdatedMuted = expectToPass(
        async () => {
          const result = await page.evaluate(
            (params) => {
              return new Promise<boolean>((resolve) => {
                params.callObj.on('member.updated', ({ member }) => {
                  if (
                    member.member_id === params.callSession.member_id &&
                    member.updated.includes('video_muted') &&
                    member.updated.includes('visible') &&
                    member.video_muted === true &&
                    member.visible === false
                  ) {
                    resolve(true)
                  }
                })
              })
            },
            { callObj, callSession }
          )
          expect(result, 'expect member video updated muted').toBe(true)
        },
        { message: 'member video updated muted' }
      )

      const videoMuteSelf = expectToPass(
        async () => {
          const result = await page.evaluate(
            async (params) => {
              await params.callObj.videoMute()
              return true
            },
            { callObj }
          )
          expect(result, 'expect video mute self').toBe(true)
        },
        { message: 'video mute self' }
      )

      await videoMuteSelf
      await memberVideoUpdatedMuted
      await memberVideoUpdatedMutedEvent
    })
    // --------------- Unmuting Video (self) ---------------

    await test.step('unmuting video (self)  ', async () => {
      const memberVideoUpdatedUnmutedEvent = expectToPass(
        async () => {
          const result = await page.evaluate(
            async (params) => {
              return new Promise<boolean>((resolve) => {
                params.callObj.on('member.updated.videoMuted', ({ member }) => {
                  if (
                    member.member_id === params.callSession.member_id &&
                    member.video_muted === false &&
                    member.visible === true
                  ) {
                    resolve(true)
                  }
                })
              })
            },
            { callObj, callSession }
          )
          expect(result, 'expect member video updated unmuted event').toBe(true)
        },
        { message: 'member video updated unmuted event' }
      )

      const memberVideoUpdatedUnmuted = expectToPass(
        async () => {
          const result = await page.evaluate(
            async (params) => {
              return new Promise<boolean>((resolve) => {
                params.callObj.on('member.updated', ({ member }) => {
                  if (
                    member.member_id === params.callSession.member_id &&
                    member.updated.includes('video_muted') &&
                    member.updated.includes('visible') &&
                    member.video_muted === false &&
                    member.visible === true
                  ) {
                    resolve(true)
                  }
                })
              })
            },
            { callObj, callSession }
          )
          expect(result, 'expect member video updated unmuted').toBe(true)
        },
        { message: 'member video updated unmuted' }
      )

      const videoUnmuteSelf = expectToPass(
        async () => {
          const result = await page.evaluate(
            async (params) => {
              await params.callObj.videoUnmute()
              return true
            },
            { callObj }
          )
          expect(result, 'expect video unmute self').toBe(true)
        },
        { message: 'video unmute self' }
      )

      await videoUnmuteSelf
      await memberVideoUpdatedUnmuted
      await memberVideoUpdatedUnmutedEvent
    })

    // --------------- Screenshare ---------------
    await test.step('screen share', async () => {
      let screenMemberId: string | undefined

      const screenMemberJoined = expectToPass(
        async () => {
          const result = await page.evaluate(
            (params) => {
              return new Promise<string>((resolve) => {
                params.callObj.on('member.joined', ({ member }) => {
                  if (member.type === 'screen') {
                    resolve(member.member_id)
                  }
                })
              })
            },
            { callObj }
          )
          expect(typeof result, 'expect screen joined result').toBe('string')
          expect(result, 'expect screen joined result').toMatch(/^[a-z0-9-]+$/) // is of a uuid
          expect(result.length, 'expect screen joined result').toBeGreaterThan(
            0
          )

          // set screenMemberId to the resolved value
          screenMemberId = result
        },
        { message: 'screen joined' }
      )

      const screenMemberLeft = expectToPass(
        async () => {
          expect(screenMemberId).toBeDefined()
          const result = await page.evaluate(
            (params) => {
              return new Promise<boolean>((resolve) => {
                params.callObj.on('member.left', ({ member }) => {
                  if (
                    member.type === 'screen' &&
                    member.member_id === params.screenMemberId
                  ) {
                    resolve(true)
                  }
                })
              })
            },
            { callObj, screenMemberId }
          )
          expect(result, 'expect screen left').toBe(true)
        },
        { message: 'screen left' }
      )

      // --------------- Start Screen Share ---------------
      const screenShareObj = await waitForFunction(
        page,
        async (params) =>
          await params.callObj.startScreenShare({
            audio: true,
            video: true,
          }),
        { callObj },
        { message: 'screen share obj' }
      )

      const screenShareIdCheckPromise = expectToPass(
        async () => {
          expect(screenMemberId).toBeDefined()
          const result = await page.evaluate(
            (params) => {
              return new Promise<boolean>((resolve) => {
                resolve(
                  params.screenMemberId === params.screenShareObj.memberId
                )
              })
            },
            { screenShareObj, screenMemberId }
          )
          expect(result, 'expect screen share id check').toBe(true)
        },
        { message: 'screen share id check' }
      )

      const screenRoomLeft = expectToPass(
        async () => {
          const result = await page.evaluate(
            (params) => {
              return new Promise<boolean>((resolve) => {
                params.screenShareObj.on('room.left', () => resolve(true))
              })
            },
            { screenShareObj }
          )
          expect(result, 'expect screen room left').toBe(true)
        },
        { message: 'screen room left' }
      )

      const screenShareObjCallLeave = expectToPass(
        async () => {
          const result = await page.evaluate(
            async (params) => {
              await params.screenShareObj.leave()
              return true
            },
            { screenShareObj }
          )
          expect(result, 'expect screen share obj left').toBe(true)
        },
        { message: 'screen share obj left' }
      )

      // preserve order of these promises
      await screenMemberJoined
      await screenShareIdCheckPromise
      await screenShareObjCallLeave
      await screenRoomLeft
      await screenMemberLeft
    })

    // --------------- Room lock/unlock ---------------
    await test.step('room lock', async () => {
      const roomUpdatedLocked = expectToPass(
        async () => {
          const result = await page.evaluate(
            async (params) => {
              return new Promise<boolean>((resolve) => {
                params.callObj.on('room.updated', ({ room_session }) => {
                  if (room_session.locked === true) {
                    resolve(true)
                  }
                })
              })
            },
            { callObj }
          )
          expect(result, 'expect room updated locked').toBe(true)
        },
        { message: 'room updated locked' }
      )

      const roomLock = waitForFunction(
        page,
        async (params) => await params.callObj.lock(),
        { callObj },
        { message: 'room lock' }
      )

      await roomLock
      await roomUpdatedLocked
    })

    await test.step('room unlock', async () => {
      const roomUpdatedUnlocked = expectToPass(
        async () => {
          const result = await page.evaluate(
            async (params) => {
              return new Promise<boolean>((resolve) => {
                params.callObj.on('room.updated', ({ room_session }) => {
                  if (room_session.locked === false) {
                    resolve(true)
                  }
                })
              })
            },
            { callObj }
          )
          expect(result, 'expect room updated unlocked').toBe(true)
        },
        { message: 'room updated unlocked' }
      )

      const roomUnlock = waitForFunction(
        page,
        async (params) => await params.callObj.unlock(),
        { callObj },
        { message: 'room unlock' }
      )

      await roomUnlock
      await roomUpdatedUnlocked
    })

    // --------------- Set layout ---------------
    await test.step('set layout', async () => {
      const LAYOUT_NAME = '3x30000'
      const layoutChangedPromise = expectLayoutChanged(page, LAYOUT_NAME)
      await setLayoutOnPage(page, LAYOUT_NAME)
      await expect(layoutChangedPromise).resolves.toBe(true)
    })

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

        const call = client.dial({
          to: `/public/invalid-address?channel=video`,
          rootElement: document.getElementById('rootElement'),
        })

        window._callObj = call

        await call.start()

        return { success: true }
      } catch (error) {
        return { success: false, error }
      }
    })

    expect(callSession.success, 'expect call session success').toBe(false)
  })

  test('should handle joining a room with audio channel only', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e_${uuid()}`
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
