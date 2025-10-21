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
      callSession = await dialAddress(page, {
        address: `/public/${roomName}?channel=video`,
      })

      expect(
        callSession.room_session,
        'room session should be defined'
      ).toBeDefined()
      expect(
        callSession.room_session.name,
        'room session name should be defined'
      ).toBeDefined()
      expect(
        callSession.room_session.display_name,
        'room session display name should be defined'
      ).toBeDefined()

      const memberId = callSession.member_id
      expect(
        callSession.room_session.members.some(
          (member) => member.member_id === memberId
        ),
        'member should be in the room'
      ).toBeTruthy()

      await expectMCUVisible(page)

      // --------------- Call Object ------------------------
      callObj = await waitForFunction(page, {
        evaluateFn: () => {
          if (window._callObj) {
            return window._callObj
          } else {
            throw new Error('Call object not found')
          }
        },
        message: 'call object',
      })
    })

    await test.step('sanity check - call object, call session and page are set', async () => {
      expect(
        callObj.getProperty('on'),
        'call object on should be defined'
      ).toBeDefined()
      expect(
        callObj.getProperty('audioMute'),
        'call object audioMute should be defined'
      ).toBeDefined()
      expect(
        callObj.getProperty('leave'),
        'call object leave should be defined'
      ).toBeDefined()
      expect(
        callSession,
        'call session room session should be defined'
      ).toHaveProperty('room_session')
      expect(
        callSession,
        'call session member id should be defined'
      ).toHaveProperty('member_id')
      expect(page.goto, 'page goto should be defined').toBeDefined()
      expect(page.evaluate, 'page evaluate should be defined').toBeDefined()
      expect(
        page.waitForSelector,
        'page waitForSelector should be defined'
      ).toBeDefined()
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
        assertionFn: (result) => {
          expect(result, 'member updated muted event resolved').toBe(true)
        },
        message: 'expect member updated muted event',
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
        assertionFn: (result) => {
          expect(result, 'member updated muted resolved').toBe(true)
        },
        message: 'expect member updated muted',
      })

      const audioMuteSelf = waitForFunction(page, {
        evaluateArgs: { callObj },
        evaluateFn: async (params) => await params.callObj.audioMute(),
        message: 'audio mute self',
      })

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
        assertionFn: (result) => {
          expect(result, 'member updated unmuted event resolved').toBe(true)
        },
        message: 'expect member updated unmuted event',
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
        assertionFn: (result) => {
          expect(result, 'member updated unmuted resolved').toBe(true)
        },
        message: 'expect member updated unmuted',
      })

      const audioUnmuteSelf = expectPageEvalToPass(page, {
        evaluateArgs: { callObj },
        evaluateFn: async (params) => {
          await params.callObj.audioUnmute()
          return true
        },
        assertionFn: (result) => {
          expect(result, 'member video updated muted event resolved').toBe(true)
        },
        message: 'expect audio unmute self',
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
        assertionFn: (result) => {
          expect(result, 'member video updated muted event resolved').toBe(true)
        },
        message: 'expect member video updated muted event',
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
        assertionFn: (result) => {
          expect(result, 'member video updated unmuted event resolved').toBe(
            true
          )
        },
        message: 'expect member video updated muted',
      })
      const videoMuteSelf = expectPageEvalToPass(page, {
        evaluateArgs: { callObj },
        evaluateFn: async (params) => {
          await params.callObj.videoMute()
          return true
        },
        assertionFn: (result) => {
          expect(result, 'video mute self resolved').toBe(true)
        },
        message: 'expect video mute self',
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
        assertionFn: (result) => {
          expect(result, 'member video updated unmuted resolved').toBe(true)
        },
        message: 'expect member video updated unmuted event',
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
        assertionFn: (result) => {
          expect(result, 'video unmute self resolved').toBe(true)
        },
        message: 'expect member video updated unmuted',
      })

      const videoUnmuteSelf = expectPageEvalToPass(page, {
        evaluateArgs: { callObj },
        evaluateFn: async (params) => {
          await params.callObj.videoUnmute()
          return true
        },
        assertionFn: (result) => {
          expect(result, 'video unmute self resolved').toBe(true)
        },
        message: 'expect video unmute self',
      })

      await videoUnmuteSelf
      await memberVideoUpdatedUnmuted
      await memberVideoUpdatedUnmutedEvent
    })

    // --------------- Screenshare ---------------
    await test.step('screen share', async () => {
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
        assertionFn: (result) => {
          // should be a string uuid type
          expect(result, 'screen joined result resolved').toBeDefined()
        },
        message: 'expect screen joined result',
      })

      // --------------- Start Screen Share ---------------
      const screenShareObj = await waitForFunction(page, {
        evaluateArgs: { callObj },
        evaluateFn: async (params) =>
          await params.callObj.startScreenShare({
            audio: true,
            video: true,
          }),
        message: 'screen share obj',
      })

      const screenMemberId = await screenMemberJoined

      // --------------- Check Screen Share ID ---------------
      await expectPageEvalToPass(page, {
        evaluateArgs: { screenShareObj, screenMemberId },
        evaluateFn: (params) => {
          return new Promise<boolean>((resolve) => {
            resolve(params.screenMemberId === params.screenShareObj.memberId)
          })
        },
        assertionFn: (result) => {
          expect(result, 'screen left resolved').toBe(true)
        },
        message: 'expect screen share id check',
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
        assertionFn: (result) => {
          expect(result, 'screen member left resolved').toBe(true)
        },
        message: 'expect screen left',
      })

      const screenRoomLeft = expectPageEvalToPass(page, {
        evaluateArgs: { screenShareObj },
        evaluateFn: (params) => {
          return new Promise<boolean>((resolve) => {
            params.screenShareObj.on('room.left', () => resolve(true))
          })
        },
        assertionFn: (result) => {
          expect(result, 'screen room left resolved').toBe(true)
        },
        message: 'expect screen room left',
      })

      const screenShareObjCallLeave = expectPageEvalToPass(page, {
        evaluateArgs: { screenShareObj },
        evaluateFn: async (params) => {
          await params.screenShareObj.leave()
          return true
        },
        assertionFn: (result) => {
          expect(result, 'screen share obj left resolved').toBe(true)
        },
        message: 'expect screen share obj left',
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
        assertionFn: (result) => {
          expect(result, 'room updated locked resolved').toBe(true)
        },
        message: 'expect room updated locked',
      })

      const roomLock = expectPageEvalToPass(page, {
        evaluateArgs: { callObj },
        evaluateFn: async (params) => {
          await params.callObj.lock()
          return true
        },
        assertionFn: (result) => {
          expect(result, 'room updated unlocked resolved').toBe(true)
        },
        message: 'expect room lock',
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
        assertionFn: (result) => {
          expect(result, 'room updated unlocked resolved').toBe(true)
        },
        message: 'expect room updated unlocked',
      })

      const roomUnlock = expectPageEvalToPass(page, {
        evaluateArgs: { callObj },
        evaluateFn: async (params) => {
          await params.callObj.unlock()
          return true
        },
        assertionFn: (result) => {
          expect(result, 'room updated unlocked resolved').toBe(true)
        },
        message: 'expect room unlock',
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
      assertionFn: (result) => {
        expect(
          result.success,
          'call session should return success as false'
        ).toBe(false)
      },
      message: 'expect call session to fail on invalid address',
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
    const callSession: CallJoinedEventParams = await dialAddress(page, {
      address: `/public/${roomName}?channel=audio`,
    })

    expect(
      callSession.room_session,
      'room session should be defined'
    ).toBeDefined()
    expect(
      callSession.room_session.members.some(
        (member) => member.member_id === callSession.member_id
      ),
      'member should be in the room'
    ).toBeTruthy()

    // There should be no inbound/outbound video
    const stats = await getStats(page)
    expect(
      stats.outboundRTP.video?.packetsSent,
      'outbound video packets sent should be 0'
    ).toBe(0)
    expect(
      stats.inboundRTP.video?.packetsReceived,
      'inbound video packets received should be 0'
    ).toBe(0)

    // There should be audio packets
    expect(
      stats.inboundRTP.audio?.packetsReceived,
      'inbound audio packets received should be greater than 0'
    ).toBeGreaterThan(0)

    // There should be no MCU either
    const videoElement = await page.$('div[id^="sw-sdk-"] > video')
    expect(videoElement, 'video element should be null').toBeNull()
  })
})
