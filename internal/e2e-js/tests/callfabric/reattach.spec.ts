import { uuid } from '@signalwire/core'
import { test, expect } from '../../fixtures'
import {
  SERVER_URL,
  createCFClient,
  dialAddress,
  expectMCUVisible,
} from '../../utils'
import {
  CallJoinedEventParams,
  FabricRoomSession,
  SignalWireClient,
} from '@signalwire/js'

test.describe('CallFabric Reattach', () => {
  test('should join a room, reload and reattach', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page)

    // Dial an address and join a video room
    let roomSession = await dialAddress(page, {
      address: `/public/${roomName}?channel=video`,
    })

    expect(roomSession.room_session).toBeDefined()
    const currentCallId = roomSession.call_id

    await expectMCUVisible(page)

    await page.reload({ waitUntil: 'domcontentloaded' })
    await createCFClient(page)

    // Reattach to an address to join the same call session
    roomSession = await page.evaluate(
      async ({ roomName }) => {
        return new Promise(async (resolve, _reject) => {
          // @ts-expect-error
          const client: SignalWireClient = window._client

          const call = await client.reattach({
            to: `/public/${roomName}?channel=video`,
            rootElement: document.getElementById('rootElement'),
          })

          call.on('call.joined', resolve)

          // @ts-expect-error
          window._roomObj = call
          await call.start()
        })
      },
      { roomName }
    )

    expect(roomSession.call_id).toEqual(currentCallId)
    // TODO the server is not sending a layout state on reattach
    // await expectMCUVisible(page)
  })

  test('should join a room, update room and self member states, reload and reattach with correct states', async ({
    createCustomPage,
    resource,
  }) => {
    const MIC_VOLUME = 10
    const SPEAKER_VOLUME = 10
    const NOISE_SENSITIVITY = 10

    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = `e2e_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await createCFClient(page)

    // Dial an address and join a video room
    const roomSessionBefore: CallJoinedEventParams = await dialAddress(page, {
      address: `/public/${roomName}?channel=video`,
    })
    expect(roomSessionBefore.room_session).toBeDefined()
    await expectMCUVisible(page)
    const memberId = roomSessionBefore.member_id

    // --------------- Muting Video (self) ---------------
    await test.step('mute the self video', async () => {
      await page.evaluate(async (memberId) => {
        // @ts-expect-error
        const roomObj: FabricRoomSession = window._roomObj

        const memberUpdatedEvent = new Promise((res) => {
          roomObj.on('member.updated', (event) => {
            if (
              event.member.member_id === memberId &&
              event.member.updated.includes('video_muted') &&
              event.member.video_muted === true
            ) {
              res(true)
            }
          })
        })
        const memberUpdatedVideoMutedEvent = new Promise((res) => {
          roomObj.on('member.updated.videoMuted', (event) => {
            if (
              event.member.member_id === memberId &&
              event.member.updated.includes('video_muted') &&
              event.member.video_muted === true
            ) {
              res(true)
            }
          })
        })

        await roomObj.videoMute()
        return Promise.all([memberUpdatedEvent, memberUpdatedVideoMutedEvent])
      }, memberId)
    })

    // --------------- Muting Audio (self) ---------------
    await test.step('mute the self audio', async () => {
      await page.evaluate(async (memberId) => {
        // @ts-expect-error
        const roomObj: FabricRoomSession = window._roomObj

        const memberUpdatedEvent = new Promise((res) => {
          roomObj.on('member.updated', (event) => {
            if (
              event.member.member_id === memberId &&
              event.member.updated.includes('audio_muted') &&
              event.member.audio_muted === true
            ) {
              res(true)
            }
          })
        })
        const memberUpdatedAudioMutedEvent = new Promise((res) => {
          roomObj.on('member.updated.audioMuted', (event) => {
            if (
              event.member.member_id === memberId &&
              event.member.updated.includes('audio_muted') &&
              event.member.audio_muted === true
            ) {
              res(true)
            }
          })
        })

        await roomObj.audioMute()
        return Promise.all([memberUpdatedEvent, memberUpdatedAudioMutedEvent])
      }, memberId)
    })

    // --------------- Room lock ---------------
    await test.step('lock room', async () => {
      await page.evaluate(
        // @ts-expect-error
        async ({ roomSession }) => {
          // @ts-expect-error
          const roomObj: FabricRoomSession = window._roomObj

          const roomUpdatedLocked = new Promise((res) => {
            roomObj.on('room.updated', (params) => {
              if (params.room_session.locked === true) {
                res(true)
              }
            })
          })

          await roomObj.lock()
          await roomUpdatedLocked
        },
        { roomSession: roomSessionBefore }
      )
    })

    // --------------- Change Audio Volume (self) ---------------
    await test.step('change mic volume', async () => {
      await page.evaluate(
        async ({ volume, memberId }) => {
          // @ts-expect-error
          const roomObj: FabricRoomSession = window._roomObj

          const memberUpdatedEvent = new Promise((res) => {
            roomObj.on('member.updated', (event) => {
              if (
                event.member.member_id === memberId &&
                event.member.updated.includes('input_volume') &&
                event.member.input_volume === volume
              ) {
                res(true)
              }
            })
          })
          const memberUpdatedInputVolumeEvent = new Promise((res) => {
            roomObj.on('member.updated.inputVolume', (event) => {
              if (
                event.member.member_id === memberId &&
                event.member.updated.includes('input_volume') &&
                event.member.input_volume === volume
              ) {
                res(true)
              }
            })
          })

          await roomObj.setInputVolume({ volume: volume })
          return Promise.all([
            memberUpdatedEvent,
            memberUpdatedInputVolumeEvent,
          ])
        },
        { volume: MIC_VOLUME, memberId }
      )
    })

    // --------------- Change Speaker Volume (self) ---------------
    await test.step('change speaker volume', async () => {
      await page.evaluate(
        async ({ volume, memberId }) => {
          // @ts-expect-error
          const roomObj: FabricRoomSession = window._roomObj

          const memberUpdatedEvent = new Promise((res) => {
            roomObj.on('member.updated', (event) => {
              if (
                event.member.member_id === memberId &&
                event.member.updated.includes('output_volume') &&
                event.member.output_volume === volume
              ) {
                res(true)
              }
            })
          })
          const memberUpdatedOutputVolumeEvent = new Promise((res) => {
            roomObj.on('member.updated.outputVolume', (event) => {
              if (
                event.member.member_id === memberId &&
                event.member.updated.includes('output_volume') &&
                event.member.output_volume === volume
              ) {
                res(true)
              }
            })
          })

          await roomObj.setOutputVolume({ volume: volume })
          return Promise.all([
            memberUpdatedEvent,
            memberUpdatedOutputVolumeEvent,
          ])
        },
        { volume: SPEAKER_VOLUME, memberId }
      )
    })

    // --------------- Change Noise Gate (self) ---------------
    await test.step('change noise gate', async () => {
      await page.evaluate(
        async ({ sensitivity, memberId }) => {
          // @ts-expect-error
          const roomObj: FabricRoomSession = window._roomObj

          const memberUpdatedEvent = new Promise((res) => {
            roomObj.on('member.updated', (event) => {
              if (
                event.member.member_id === memberId &&
                event.member.updated.includes('input_sensitivity') &&
                event.member.input_sensitivity === sensitivity
              ) {
                res(true)
              }
            })
          })
          const memberUpdatedInputSensitivityEvent = new Promise((res) => {
            roomObj.on('member.updated.inputSensitivity', (event) => {
              if (
                event.member.member_id === memberId &&
                event.member.input_sensitivity === sensitivity
              ) {
                res(true)
              }
            })
          })

          await roomObj.setInputSensitivity({ value: sensitivity })
          return Promise.all([
            memberUpdatedEvent,
            memberUpdatedInputSensitivityEvent,
          ])
        },
        { sensitivity: NOISE_SENSITIVITY, memberId }
      )
    })

    const roomSessionAfter =
      await test.step('reload page and reattach', async () => {
        await page.reload({ waitUntil: 'domcontentloaded' })
        await createCFClient(page)

        // Reattach to an address to join the same call session
        const roomSession: CallJoinedEventParams = await page.evaluate(
          async ({ roomName }) => {
            return new Promise(async (resolve, _reject) => {
              const client = window._client!

              const call = await client.reattach({
                to: `/public/${roomName}?channel=video`,
                rootElement: document.getElementById('rootElement'),
              })

              call.on('call.joined', resolve)

              // @ts-expect-error
              window._roomObj = call
              await call.start()
            })
          },
          { roomName }
        )

        return roomSession
      })

    await test.step('assert room state', async () => {
      expect(roomSessionAfter.room_session).toBeDefined()
      expect(roomSessionAfter.call_id).toEqual(roomSessionBefore.call_id)
      expect(roomSessionAfter.room_session.locked).toBe(true)

      const selfMember = roomSessionAfter.room_session.members.find(
        (member) => member.member_id === roomSessionAfter.member_id
      )

      expect(selfMember).toBeDefined()
      expect(selfMember?.audio_muted).toBe(true)
      expect(selfMember?.video_muted).toBe(true)
      expect(selfMember?.input_volume).toBe(MIC_VOLUME)
      expect(selfMember?.output_volume).toBe(SPEAKER_VOLUME)
      expect(selfMember?.input_sensitivity).toBe(NOISE_SENSITIVITY)

      const localVideoTrack = await page.evaluate(
        // @ts-expect-error
        () => window._roomObj.peer.localVideoTrack
      )
      expect(localVideoTrack).toEqual({})

      const localAudioTrack = await page.evaluate(
        // @ts-expect-error
        () => window._roomObj.peer.localAudioTrack
      )
      expect(localAudioTrack).toEqual({})
    })
  })

  test('should join a room, update other member states, reload and reattach with correct states', async ({
    createCustomPage,
    resource,
  }) => {
    const MIC_VOLUME = 10
    const SPEAKER_VOLUME = 10
    const NOISE_SENSITIVITY = 10

    const pageOne = await createCustomPage({ name: '[pageOne]' })
    const pageTwo = await createCustomPage({ name: '[pageTwo]' })
    await pageOne.goto(SERVER_URL)
    await pageTwo.goto(SERVER_URL)

    const roomName = `e2e_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    await test.step('[pageOne] create client and join a room', async () => {
      await createCFClient(pageOne)
      // Dial an address and join a video room
      const roomSession: CallJoinedEventParams = await dialAddress(pageOne, {
        address: `/public/${roomName}?channel=video`,
      })
      expect(roomSession.room_session).toBeDefined()
      expect(roomSession.room_session.members).toBeDefined()
      expect(roomSession.room_session.members).toHaveLength(1)
      await expectMCUVisible(pageOne)
      return roomSession
    })

    const roomSessionTwo =
      await test.step('[pageTwo] create client and join a room', async () => {
        await createCFClient(pageTwo)
        // Dial an address and join a video room
        const roomSession: CallJoinedEventParams = await dialAddress(pageTwo, {
          address: `/public/${roomName}?channel=video`,
        })
        expect(roomSession.room_session).toBeDefined()
        expect(roomSession.room_session.members).toBeDefined()
        expect(roomSession.room_session.members).toHaveLength(2)
        await expectMCUVisible(pageTwo)
        return roomSession
      })

    const [_memberOneId, memberTwoId] = roomSessionTwo.room_session.members.map(
      (member) => member.member_id
    )

    // --------------- Muting Video (other member) ---------------
    await test.step('[pageOne] mute video of memberTwo', async () => {
      await pageOne.evaluate(async (memberId) => {
        // @ts-expect-error
        const roomObj: FabricRoomSession = window._roomObj

        const memberUpdatedEvent = new Promise((res) => {
          roomObj.on('member.updated', (event) => {
            if (
              event.member.member_id === memberId &&
              event.member.updated.includes('video_muted') &&
              event.member.video_muted === true
            ) {
              res(true)
            }
          })
        })
        const memberUpdatedVideoMutedEvent = new Promise((res) => {
          roomObj.on('member.updated.videoMuted', (event) => {
            if (
              event.member.member_id === memberId &&
              event.member.updated.includes('video_muted') &&
              event.member.video_muted == true
            ) {
              res(true)
            }
          })
        })

        await roomObj.videoMute({ memberId })
        return Promise.all([memberUpdatedEvent, memberUpdatedVideoMutedEvent])
      }, memberTwoId)
    })

    // --------------- Muting Audio (other member) ---------------
    await test.step('[pageOne] mute audio of memberTwo', async () => {
      await pageOne.evaluate(async (memberId) => {
        // @ts-expect-error
        const roomObj: FabricRoomSession = window._roomObj

        const memberUpdatedEvent = new Promise((res) => {
          roomObj.on('member.updated', (event) => {
            if (
              event.member.member_id === memberId &&
              event.member.updated.includes('audio_muted') &&
              event.member.audio_muted === true
            ) {
              res(true)
            }
          })
        })
        const memberUpdatedAudioMutedEvent = new Promise((res) => {
          roomObj.on('member.updated.audioMuted', (event) => {
            if (
              event.member.member_id === memberId &&
              event.member.updated.includes('audio_muted') &&
              event.member.audio_muted == true
            ) {
              res(true)
            }
          })
        })

        await roomObj.audioMute({ memberId })
        return Promise.all([memberUpdatedEvent, memberUpdatedAudioMutedEvent])
      }, memberTwoId)
    })

    // --------------- Change Audio Volume (other member) ---------------
    await test.step('[pageOne] change mic volume for memberTwo', async () => {
      await pageOne.evaluate(
        async ({ volume, memberId }) => {
          // @ts-expect-error
          const roomObj: FabricRoomSession = window._roomObj

          const memberUpdatedEvent = new Promise((res) => {
            roomObj.on('member.updated', (event) => {
              if (
                event.member.member_id === memberId &&
                event.member.updated.includes('input_volume') &&
                event.member.input_volume === volume
              ) {
                res(true)
              }
            })
          })
          const memberUpdatedInputVolumeEvent = new Promise((res) => {
            roomObj.on('member.updated.inputVolume', (event) => {
              if (
                event.member.member_id === memberId &&
                event.member.updated.includes('input_volume') &&
                event.member.input_volume === volume
              )
                res(true)
            })
          })

          await roomObj.setInputVolume({ volume, memberId })
          return Promise.all([
            memberUpdatedEvent,
            memberUpdatedInputVolumeEvent,
          ])
        },
        { volume: MIC_VOLUME, memberId: memberTwoId }
      )
    })

    // --------------- Change Speaker Volume (other member) ---------------
    await test.step('[pageOne] change speaker volume for memberTwo', async () => {
      await pageOne.evaluate(
        async ({ volume, memberId }) => {
          // @ts-expect-error
          const roomObj: FabricRoomSession = window._roomObj

          const memberUpdatedEvent = new Promise((res) => {
            roomObj.on('member.updated', (event) => {
              if (
                event.member.member_id === memberId &&
                event.member.updated.includes('output_volume') &&
                event.member.output_volume === volume
              ) {
                res(true)
              }
            })
          })
          const memberUpdatedOutputVolumeEvent = new Promise((res) => {
            roomObj.on('member.updated.outputVolume', (event) => {
              if (
                event.member.member_id === memberId &&
                event.member.updated.includes('output_volume') &&
                event.member.output_volume === volume
              )
                res(true)
            })
          })

          await roomObj.setOutputVolume({ volume, memberId })
          return Promise.all([
            memberUpdatedEvent,
            memberUpdatedOutputVolumeEvent,
          ])
        },
        { volume: SPEAKER_VOLUME, memberId: memberTwoId }
      )
    })

    // --------------- Change Noise Gate (other member) ---------------
    await test.step('[pageOne] change noise gate for memberTwo', async () => {
      await pageOne.evaluate(
        async ({ sensitivity, memberId }) => {
          // @ts-expect-error
          const roomObj: FabricRoomSession = window._roomObj

          const memberUpdatedEvent = new Promise((res) => {
            roomObj.on('member.updated', (event) => {
              if (
                event.member.member_id === memberId &&
                event.member.updated.includes('input_sensitivity') &&
                event.member.input_sensitivity === sensitivity
              ) {
                res(true)
              }
            })
          })
          const memberUpdatedInputSensitivityEvent = new Promise((res) => {
            roomObj.on('member.updated.inputSensitivity', (event) => {
              if (
                event.member.member_id === memberId &&
                event.member.updated.includes('input_sensitivity') &&
                event.member.input_sensitivity === sensitivity
              ) {
                res(true)
              }
            })
          })

          await roomObj.setInputSensitivity({ value: sensitivity, memberId })
          return Promise.all([
            memberUpdatedEvent,
            memberUpdatedInputSensitivityEvent,
          ])
        },
        { sensitivity: NOISE_SENSITIVITY, memberId: memberTwoId }
      )
    })

    const roomSessionTwoAfter =
      await test.step('[pageTwo] reload page and reattach', async () => {
        await pageTwo.reload({ waitUntil: 'domcontentloaded' })
        await createCFClient(pageTwo)

        // Reattach to an address to join the same call session
        const roomSession: CallJoinedEventParams = await pageTwo.evaluate(
          async ({ roomName }) => {
            return new Promise(async (resolve, _reject) => {
              const client = window._client!

              const call = await client.reattach({
                to: `/public/${roomName}?channel=video`,
                rootElement: document.getElementById('rootElement'),
              })

              call.on('call.joined', resolve)

              // @ts-expect-error
              window._roomObj = call
              await call.start()
            })
          },
          { roomName }
        )

        return roomSession
      })

    await test.step('[pageTwo] assert room state', async () => {
      expect(roomSessionTwoAfter.room_session).toBeDefined()
      expect(roomSessionTwoAfter.call_id).toEqual(roomSessionTwo.call_id)
      expect(roomSessionTwoAfter.room_session.members).toHaveLength(2)

      const selfMember = roomSessionTwoAfter.room_session.members.find(
        (member) => member.member_id === roomSessionTwoAfter.member_id
      )

      expect(selfMember).toBeDefined()
      expect(selfMember?.audio_muted).toBe(true)
      expect(selfMember?.video_muted).toBe(true)
      expect(selfMember?.input_volume).toBe(MIC_VOLUME)
      expect(selfMember?.output_volume).toBe(SPEAKER_VOLUME)

      const localVideoTrack = await pageTwo.evaluate(
        // @ts-expect-error
        () => window._roomObj.peer.localVideoTrack
      )
      expect(localVideoTrack).toEqual({})
      const localAudioTrack = await pageTwo.evaluate(
        // @ts-expect-error
        () => window._roomObj.peer.localAudioTrack
      )
      expect(localAudioTrack).toEqual({})
    })
  })

  // TODO uncomment after fixed in the backend
  // test('WebRTC to SWML to Room', async ({
  //   createCustomPage,
  //   resource,
  // }) => {

  //   const page = await createCustomPage({ name: '[page]' })
  //   await page.goto(SERVER_URL)

  //   const roomName = `e2e_${uuid()}`
  //   await resource.createVideoRoomResource(roomName)
  //   const resourceName = `e2e_${uuid()}`
  //   await resource.createSWMLAppResource({
  //     name: resourceName,
  //     contents: {
  //       sections: {
  //         main: [
  //           'answer',
  //           {
  //             play: {
  //               volume: 10,
  //               urls: [
  //                 'silence:1.0',
  //                 'say:Hello, connecting to a fabric resource that is a room',
  //               ],
  //             },
  //             connect: {
  //               to: `/public/${roomName}`,
  //               answer_on_bridge: true
  //             }
  //           },
  //         ],
  //       },
  //     },
  //   })

  //   await createCFClient(page)

  //   // Dial an address and join a video room
  //   let roomSession = await page.evaluate(
  //     async ({ resourceName }) => {
  //       return new Promise<any>(async (resolve, _reject) => {
  //         // @ts-expect-error
  //         const client = window._client
  //         let callJoinedCount = 0

  //         const call = await client.dial({
  //           to: `/private/${resourceName}`,
  //           rootElement: document.getElementById('rootElement'),
  //         })

  //         call.on('call.joined', (event: any) => {
  //           callJoinedCount++
  //           if(callJoinedCount >= 2) {
  //             resolve(event)
  //           }
  //         })

  //         // @ts-expect-error
  //         window._roomObj = call

  //         await call.start()
  //       })
  //     },
  //     { resourceName }
  //   )

  //   expect(roomSession.room_session).toBeDefined()
  //   const currentCallId = roomSession.call_id

  //   await expectMCUVisible(page)

  //   await page.reload({ waitUntil: 'domcontentloaded'})
  //   await createCFClient(page)

  //   // FIXME Server is not accepting the invite
  //   // Reattach to an address to join the same call session
  //   roomSession = await page.evaluate(
  //     async ({ resourceName }) => {
  //       return new Promise<any>(async (resolve, _reject) => {
  //         // @ts-expect-error
  //         const client = window._client

  //         const call = await client.reattach({
  //           to: `/private/${resourceName}`,
  //           rootElement: document.getElementById('rootElement'),
  //         })

  //         call.on('call.joined', resolve)

  //         // @ts-expect-error
  //         window._roomObj = call
  //         await call.start()
  //       })
  //     },
  //     { resourceName }
  //   )

  //   expect(roomSession.call_id).toEqual(currentCallId)
  //   // TODO the server is not sending a layout state on reattach
  //   // await expectMCUVisible(page)
  // })
})
