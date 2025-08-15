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

test.describe('CallCall VideoRoom', () => {
  test('should handle joining a room, perform actions and then leave the room', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
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

    // --------------- Muting Audio (self) ---------------
    await page.evaluate(
      async ({ callSession }) => {
        // @ts-expect-error
        const callObj: CallSession = window._callObj

        // Use Promise.withResolvers for better event handling
        const { promise: memberMutedPromise, resolve: resolveMuted } = Promise.withResolvers()
        const { promise: memberUnmutedPromise, resolve: resolveUnmuted } = Promise.withResolvers()

        let mutedEventsReceived = 0
        let unmutedEventsReceived = 0

        // Set up event listeners for muted state
        const handleMutedUpdate = (params: any) => {
          if (
            params.member.member_id === callSession.member_id &&
            params.member.updated.includes('audio_muted') &&
            params.member.audio_muted === true
          ) {
            mutedEventsReceived++
            if (mutedEventsReceived >= 2) { // Both member.updated and member.updated.audioMuted
              resolveMuted(true)
            }
          }
        }

        const handleMutedUpdateAudio = (params: any) => {
          if (
            params.member.member_id === callSession.member_id &&
            params.member.audio_muted === true
          ) {
            mutedEventsReceived++
            if (mutedEventsReceived >= 2) { // Both member.updated and member.updated.audioMuted
              resolveMuted(true)
            }
          }
        }

        // Set up event listeners for unmuted state
        const handleUnmutedUpdate = (params: any) => {
          if (
            params.member.member_id === callSession.member_id &&
            params.member.updated.includes('audio_muted') &&
            params.member.audio_muted === false
          ) {
            unmutedEventsReceived++
            if (unmutedEventsReceived >= 2) { // Both member.updated and member.updated.audioMuted
              resolveUnmuted(true)
            }
          }
        }

        const handleUnmutedUpdateAudio = (params: any) => {
          if (
            params.member.member_id === callSession.member_id &&
            params.member.audio_muted === false
          ) {
            unmutedEventsReceived++
            if (unmutedEventsReceived >= 2) { // Both member.updated and member.updated.audioMuted
              resolveUnmuted(true)
            }
          }
        }

        // Attach event listeners
        callObj.on('member.updated', handleMutedUpdate)
        callObj.on('member.updated.audioMuted', handleMutedUpdateAudio)

        await callObj.audioMute()
        await memberMutedPromise

        // Clean up muted listeners and set up unmuted listeners
        callObj.off('member.updated', handleMutedUpdate)
        callObj.off('member.updated.audioMuted', handleMutedUpdateAudio)
        callObj.on('member.updated', handleUnmutedUpdate)
        callObj.on('member.updated.audioMuted', handleUnmutedUpdateAudio)

        await callObj.audioUnmute()
        await memberUnmutedPromise

        // Clean up unmuted listeners
        callObj.off('member.updated', handleUnmutedUpdate)
        callObj.off('member.updated.audioMuted', handleUnmutedUpdateAudio)

        return true
      },
      { callSession }
    )

    // --------------- Muting Video (self) ---------------
    await page.evaluate(
      async ({ callSession }) => {
        // @ts-expect-error
        const callObj: CallSession = window._callObj

        // Use Promise.withResolvers for better event handling
        const { promise: memberMutedPromise, resolve: resolveMuted } = Promise.withResolvers()
        const { promise: memberUnmutedPromise, resolve: resolveUnmuted } = Promise.withResolvers()

        let mutedEventsReceived = 0
        let unmutedEventsReceived = 0

        // Set up event listeners for muted state
        const handleMutedUpdate = (params: any) => {
          if (
            params.member.member_id === callSession.member_id &&
            params.member.updated.includes('video_muted') &&
            params.member.updated.includes('visible') &&
            params.member.video_muted === true &&
            params.member.visible === false
          ) {
            mutedEventsReceived++
            if (mutedEventsReceived >= 2) { // Both member.updated and member.updated.videoMuted
              resolveMuted(true)
            }
          }
        }

        const handleMutedUpdateVideo = (params: any) => {
          if (
            params.member.member_id === callSession.member_id &&
            params.member.video_muted === true &&
            params.member.visible === false
          ) {
            mutedEventsReceived++
            if (mutedEventsReceived >= 2) { // Both member.updated and member.updated.videoMuted
              resolveMuted(true)
            }
          }
        }

        // Set up event listeners for unmuted state
        const handleUnmutedUpdate = (params: any) => {
          if (
            params.member.member_id === callSession.member_id &&
            params.member.updated.includes('video_muted') &&
            params.member.updated.includes('visible') &&
            params.member.video_muted === false &&
            params.member.visible === true
          ) {
            unmutedEventsReceived++
            if (unmutedEventsReceived >= 2) { // Both member.updated and member.updated.videoMuted
              resolveUnmuted(true)
            }
          }
        }

        const handleUnmutedUpdateVideo = (params: any) => {
          if (
            params.member.member_id === callSession.member_id &&
            params.member.video_muted === false &&
            params.member.visible === true
          ) {
            unmutedEventsReceived++
            if (unmutedEventsReceived >= 2) { // Both member.updated and member.updated.videoMuted
              resolveUnmuted(true)
            }
          }
        }

        // Attach event listeners
        callObj.on('member.updated', handleMutedUpdate)
        callObj.on('member.updated.videoMuted', handleMutedUpdateVideo)

        await callObj.videoMute()
        await memberMutedPromise

        // Clean up muted listeners and set up unmuted listeners
        callObj.off('member.updated', handleMutedUpdate)
        callObj.off('member.updated.videoMuted', handleMutedUpdateVideo)
        callObj.on('member.updated', handleUnmutedUpdate)
        callObj.on('member.updated.videoMuted', handleUnmutedUpdateVideo)

        await callObj.videoUnmute()
        await memberUnmutedPromise

        // Clean up unmuted listeners
        callObj.off('member.updated', handleUnmutedUpdate)
        callObj.off('member.updated.videoMuted', handleUnmutedUpdateVideo)

        return true
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

        // Use Promise.withResolvers for better event handling
        const { promise: roomLockedPromise, resolve: resolveRoomLocked } = Promise.withResolvers()
        const { promise: roomUnlockedPromise, resolve: resolveRoomUnlocked } = Promise.withResolvers()

        // Set up event listeners
        const handleRoomLocked = (params: any) => {
          if (params.room_session.locked === true) {
            resolveRoomLocked(true)
          }
        }

        const handleRoomUnlocked = (params: any) => {
          if (params.room_session.locked === false) {
            resolveRoomUnlocked(true)
          }
        }

        // Attach event listener for lock
        callObj.on('room.updated', handleRoomLocked)

        await callObj.lock()
        await roomLockedPromise

        // Clean up lock listener and set up unlock listener
        callObj.off('room.updated', handleRoomLocked)
        callObj.on('room.updated', handleRoomUnlocked)

        await callObj.unlock()
        await roomUnlockedPromise

        // Clean up unlock listener
        callObj.off('room.updated', handleRoomUnlocked)
      },
      { callSession }
    )

    // --------------- Set layout ---------------
    const layoutName = '3x3'
    const layoutChangedPromise = expectLayoutChanged(page, layoutName)
    await setLayoutOnPage(page, layoutName)
    expect(await layoutChangedPromise).toBe(true)

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

    // Dial an address and join a video room
    const callSession = await page.evaluate(async () => {
      try {
        const client = window._client!

        // Example of new dial() API with Promise.withResolvers pattern:
        // const { promise: memberPromise, resolve: resolveMember } = Promise.withResolvers()
        // 
        // const call = await client.dial({
        //   to: `/public/some-address?channel=video`,
        //   rootElement: document.getElementById('rootElement'),
        //   listen: {
        //     'member.updated': resolveMember, // Pass resolver directly
        //     'call.joined': (params) => console.log('Call joined', params)
        //   }
        // })
        //
        // await memberPromise // Wait for member.updated event

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
