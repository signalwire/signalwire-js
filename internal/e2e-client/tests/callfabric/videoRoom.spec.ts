import { uuid } from '@signalwire/core'
import { CallJoinedEventParams, CallSession } from '@signalwire/client'
import { test, expect, CustomPage } from '../../fixtures'
import {
  SERVER_URL,
  createCFClient,
  dialAddress,
  expectLayoutChanged,
  expectMCUVisible,
  expectPageEvalToPass,
  getStats,
  setLayoutOnPage,
  waitForFunction,
} from '../../utils'
import { JSHandle } from '@playwright/test'

test.describe('CallCall VideoRoom', () => {
  test('should handle joining a room, perform actions and then leave the room', async ({
    createCustomPage,
    resource,
  }) => {
    let callObj = {} as JSHandle<CallSession>
    let callSession = {} as CallJoinedEventParams
    let page = {} as CustomPage

    await test.step('setup page and call', async () => {
      page = await createCustomPage({ name: '[page]' })
      await page.goto(SERVER_URL)

      const roomName = `e2e_${uuid()}`
      await resource.createVideoRoomResource(roomName)

      await createCFClient(page)

      // Dial an address and join a video room
      callSession = (await dialAddress(page, {
        address: `/public/${roomName}?channel=video`,
      })) as CallJoinedEventParams

      expect(callSession.room_session).toBeDefined()
      expect(callSession.room_session.name).toBeDefined()
      expect(callSession.room_session.display_name).toBeDefined()

      const memberId = callSession.member_id
      expect(
        callSession.room_session.members.some(
          (member) => member.member_id === memberId
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

    await test.step('sanity check - call object, call session and page are set', async () => {
      expect(callObj.getProperty('on')).toBeDefined()
      expect(callObj.getProperty('audioMute')).toBeDefined()
      expect(callObj.getProperty('leave')).toBeDefined()
      expect(callSession).toHaveProperty('room_session')
      expect(callSession).toHaveProperty('member_id')
      expect(page.goto).toBeDefined()
      expect(page.evaluate).toBeDefined()
      expect(page.waitForSelector).toBeDefined()
    })

    // --------------- Muting Audio (self) ---------------
    await test.step('muting audio (self)', async () => {
      const memberUpdatedMutedEvent = expectPageEvalToPass(page, {
        evaluateArgs: { callObj, callSession },
        evaluateFn: (params) => {
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
        messageAssert: 'expect member updated muted event',
        messageError: 'member updated muted event',
      })

      const memberUpdatedMuted = expectPageEvalToPass(page, {
        evaluateArgs: { callObj, callSession },
        evaluateFn: (params) => {
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
        messageAssert: 'expect member updated muted',
        messageError: 'member updated muted',
      })

      const audioMuteSelf = waitForFunction(
        page,
        async (params) => await params.callObj.audioMute(),
        { callObj },
        { message: 'audio mute self' }
      )

      await audioMuteSelf
      await memberUpdatedMuted
      await memberUpdatedMutedEvent
    })
    // --------------- Unmuting Audio (self) ---------------
    await test.step('unmuting audio (self)', async () => {
      const memberUpdatedUnmutedEvent = expectPageEvalToPass(page, {
        evaluateArgs: { callObj, callSession },
        evaluateFn: (params) => {
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
        messageAssert: 'expect member updated unmuted event',
        messageError: 'member updated unmuted event',
      })

      const memberUpdatedUnmuted = expectPageEvalToPass(page, {
        evaluateArgs: { callObj, callSession },
        evaluateFn: (params) => {
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
        messageAssert: 'expect member updated unmuted',
        messageError: 'member updated unmuted',
      })

      const audioUnmuteSelf = expectPageEvalToPass(page, {
        evaluateArgs: { callObj },
        evaluateFn: async (params) => {
          await params.callObj.audioUnmute()
          return true
        },
        messageAssert: 'expect audio unmute self',
        messageError: 'audio unmute self',
      })

      await audioUnmuteSelf
      await memberUpdatedUnmuted
      await memberUpdatedUnmutedEvent
    })
    // --------------- Muting Video (self) ---------------
    await test.step('muting video (self)', async () => {
      const memberVideoUpdatedMutedEvent = expectPageEvalToPass(page, {
        evaluateArgs: { callObj, callSession },
        evaluateFn: (params) => {
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
        messageAssert: 'expect member video updated muted event',
        messageError: 'member video updated muted event',
      })

      const memberVideoUpdatedMuted = expectPageEvalToPass(page, {
        evaluateArgs: { callObj, callSession },
        evaluateFn: (params) => {
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
        messageAssert: 'expect member video updated muted',
        messageError: 'member video updated muted',
      })
      const videoMuteSelf = expectPageEvalToPass(page, {
        evaluateArgs: { callObj },
        evaluateFn: async (params) => {
          await params.callObj.videoMute()
          return true
        },
        messageAssert: 'expect video mute self',
        messageError: 'video mute self',
      })

      await videoMuteSelf
      await memberVideoUpdatedMuted
      await memberVideoUpdatedMutedEvent
    })
    // --------------- Unmuting Video (self) ---------------

    await test.step('unmuting video (self)  ', async () => {
      const memberVideoUpdatedUnmutedEvent = expectPageEvalToPass(page, {
        evaluateArgs: { callObj, callSession },
        evaluateFn: (params) => {
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
        messageAssert: 'expect member video updated unmuted event',
        messageError: 'member video updated unmuted event',
      })

      const memberVideoUpdatedUnmuted = expectPageEvalToPass(page, {
        evaluateArgs: { callObj, callSession },
        evaluateFn: async (params) => {
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
        messageAssert: 'expect member video updated unmuted',
        messageError: 'member video updated unmuted',
      })

      const videoUnmuteSelf = expectPageEvalToPass(page, {
        evaluateArgs: { callObj },
        evaluateFn: async (params) => {
          await params.callObj.videoUnmute()
          return true
        },
        messageAssert: 'expect video unmute self',
        messageError: 'video unmute self',
      })

      await videoUnmuteSelf
      await memberVideoUpdatedUnmuted
      await memberVideoUpdatedUnmutedEvent
    })

    // --------------- Screenshare ---------------
    await test.step('screen share', async () => {
      let screenMemberId: string | undefined

      const screenMemberJoined = expectPageEvalToPass(page, {
        evaluateArgs: { callObj },
        evaluateFn: async (params) => {
          return new Promise<string>((resolve) => {
            params.callObj.on('member.joined', ({ member }) => {
              if (member.type === 'screen') {
                resolve(member.member_id)
              }
            })
          })
        },
        assertionFn: (result, message) => {
          expect(typeof result, message).toBe('string')
          expect(result, message).toMatch(/^[a-z0-9-]+$/) // is of a uuid
          expect(result.length, message).toBeGreaterThan(0)
          // set screenMemberId to the resolved value
          screenMemberId = result
        },
        messageAssert: 'expect screen joined result',
        messageError: 'screen joined',
      })

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

      // --------------- Check Screen Share ID ---------------
      await expectPageEvalToPass(page, {
        evaluateArgs: { screenShareObj, screenMemberId },
        evaluateFn: (params) => {
          return new Promise<boolean>((resolve) => {
            resolve(params.screenMemberId === params.screenShareObj.memberId)
          })
        },
        assertionFn: (result, message) => {
          expect(screenMemberId).toBeDefined()
          expect(result, message).toBe(true)
        },
        messageAssert: 'expect screen share id check',
        messageError: 'screen share id check',
      })

      const screenMemberLeft = expectPageEvalToPass(page, {
        evaluateArgs: { callObj, screenMemberId },
        evaluateFn: async (params) => {
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
        messageAssert: 'expect screen left',
        messageError: 'screen left',
      })

      const screenRoomLeft = expectPageEvalToPass(page, {
        evaluateArgs: { screenShareObj },
        evaluateFn: (params) => {
          return new Promise<boolean>((resolve) => {
            params.screenShareObj.on('room.left', () => resolve(true))
          })
        },
        messageAssert: 'expect screen room left',
        messageError: 'screen room left',
      })

      const screenShareObjCallLeave = expectPageEvalToPass(page, {
        evaluateArgs: { screenShareObj },
        evaluateFn: async (params) => {
          await params.screenShareObj.leave()
          return true
        },
        messageAssert: 'expect screen share obj left',
        messageError: 'screen share obj left',
      })

      // preserve order of these promises
      await screenMemberJoined
      await screenShareObjCallLeave
      await screenRoomLeft
      await screenMemberLeft
    })

    // --------------- Room lock/unlock ---------------
    await test.step('room lock', async () => {
      const roomUpdatedLocked = expectPageEvalToPass(page, {
        evaluateArgs: { callObj },
        evaluateFn: async (params) => {
          return new Promise<boolean>((resolve) => {
            params.callObj.on('room.updated', ({ room_session }) => {
              if (room_session.locked === true) {
                resolve(true)
              }
            })
          })
        },
        messageAssert: 'expect room updated locked',
        messageError: 'room updated locked',
      })

      const roomLock = expectPageEvalToPass(page, {
        evaluateArgs: { callObj },
        evaluateFn: async (params) => {
          await params.callObj.lock()
          return true
        },
        messageAssert: 'expect room lock',
        messageError: 'room lock',
      })

      await roomLock
      await roomUpdatedLocked
    })

    await test.step('room unlock', async () => {
      const roomUpdatedUnlocked = expectPageEvalToPass(page, {
        evaluateArgs: { callObj },
        evaluateFn: async (params) => {
          return new Promise<boolean>((resolve) => {
            params.callObj.on('room.updated', ({ room_session }) => {
              if (room_session.locked === false) {
                resolve(true)
              }
            })
          })
        },
        messageAssert: 'expect room updated unlocked',
        messageError: 'room updated unlocked',
      })

      const roomUnlock = expectPageEvalToPass(page, {
        evaluateArgs: { callObj },
        evaluateFn: async (params) => {
          await params.callObj.unlock()
          return true
        },
        messageAssert: 'expect room unlock',
        messageError: 'room unlock',
      })

      await roomUnlock
      await roomUpdatedUnlocked
    })

    // --------------- Set layout ---------------
    await test.step('set layout', async () => {
      const LAYOUT_NAME = '3x3'
      const layoutChangedPromise = expectLayoutChanged(page, LAYOUT_NAME)
      await setLayoutOnPage(page, LAYOUT_NAME)
      await expect(layoutChangedPromise).resolves.toBe(true)
    })

    /**
     * FIXME: The following APIs are not yet supported by the Call Call SDK
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

    // Dial an address and join a video room using expectPageEvalToPass
    await expectPageEvalToPass(page, {
      evaluateFn: async () => {
        try {
          const client = window._client
          if (!client) {
            throw new Error('Client not found')
          }

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
      },
      assertionFn: (result, message) => {
        expect(result.success, message).toBe(false)
      },
      messageAssert: 'expect call session to fail on invalid address',
      messageError: 'call session did not fail as expected',
    })
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
    const callSession = (await dialAddress(page, {
      address: `/public/${roomName}?channel=audio`,
    })) as any

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
