import { uuid } from '@signalwire/core'
import { CallSession, CallJoinedEventParams } from '@signalwire/client'
import { test, expect, CustomPage } from '../../fixtures'
import {
  SERVER_URL,
  createCFClient,
  dialAddress,
  expectMCUVisible,
  expectPageEvalToPass,
} from '../../utils'

test.describe('CallCall Audio Flags', () => {
  test('should join a room, update audio flags for self member, reload and reattach with correct states', async ({
    createCustomPage,
    resource,
  }) => {
    let page = {} as CustomPage
    let roomName = ''
    let roomSessionBefore = {} as CallJoinedEventParams
    let roomSessionAfter = {} as CallJoinedEventParams
    let memberId = ''

    await test.step('setup page, room and initial call', async () => {
      page = await createCustomPage({ name: '[page]' })
      await page.goto(SERVER_URL)

      roomName = `e2e_${uuid()}`
      await resource.createVideoRoomResource(roomName)

      await createCFClient(page)

      // Dial an address and join a video room
      roomSessionBefore = await dialAddress(page, {
        address: `/public/${roomName}?channel=video`,
      })

      expect(
        roomSessionBefore.room_session,
        'room session should be defined'
      ).toBeDefined()
      await expectMCUVisible(page)

      memberId = roomSessionBefore.member_id
      expect(memberId, 'member ID should be defined').toBeDefined()
    })

    await test.step('change audio flags', async () => {
      // Set up all event listeners first
      const memberUpdatedEvent = expectPageEvalToPass(page, {
        evaluateArgs: { memberId },
        evaluateFn: (params) => {
          return new Promise<boolean>((resolve) => {
            const callObj = window._callObj

            if (!callObj) {
              throw new Error('Call object not found')
            }

            callObj.on('member.updated', (eventParams) => {
              if (
                eventParams.member.member_id === params.memberId &&
                eventParams.member.updated.includes('noise_suppression') &&
                eventParams.member.updated.includes('echo_cancellation') &&
                eventParams.member.updated.includes('auto_gain') &&
                eventParams.member.auto_gain === false &&
                eventParams.member.echo_cancellation === false &&
                eventParams.member.noise_suppression === false
              ) {
                resolve(true)
              }
            })
          })
        },
        assertionFn: (result) => {
          expect(result, 'member updated event should resolve').toBe(true)
        },
        message: 'expect member updated event',
      })

      const memberUpdatedAutoGainEvent = expectPageEvalToPass(page, {
        evaluateArgs: { memberId },
        evaluateFn: (params) => {
          return new Promise<boolean>((resolve) => {
            const callObj = window._callObj

            if (!callObj) {
              throw new Error('Call object not found')
            }

            callObj.on('member.updated.autoGain', (eventParams) => {
              if (
                eventParams.member.member_id === params.memberId &&
                eventParams.member.updated.includes('auto_gain') &&
                eventParams.member.auto_gain === false
              ) {
                resolve(true)
              }
            })
          })
        },
        assertionFn: (result) => {
          expect(result, 'auto gain updated event should resolve').toBe(true)
        },
        message: 'expect member updated auto gain event',
      })

      const memberUpdatedEchoCancellationEvent = expectPageEvalToPass(page, {
        evaluateArgs: { memberId },
        evaluateFn: (params) => {
          return new Promise<boolean>((resolve) => {
            const callObj = window._callObj

            if (!callObj) {
              throw new Error('Call object not found')
            }

            callObj.on('member.updated.echoCancellation', (eventParams) => {
              if (
                eventParams.member.member_id === params.memberId &&
                eventParams.member.updated.includes('echo_cancellation') &&
                eventParams.member.echo_cancellation === false
              ) {
                resolve(true)
              }
            })
          })
        },
        assertionFn: (result) => {
          expect(result, 'echo cancellation updated event should resolve').toBe(
            true
          )
        },
        message: 'expect member updated echo cancellation event',
      })

      const memberUpdatedNoiseSuppressionEvent = expectPageEvalToPass(page, {
        evaluateArgs: { memberId },
        evaluateFn: (params) => {
          return new Promise<boolean>((resolve) => {
            const callObj = window._callObj

            if (!callObj) {
              throw new Error('Call object not found')
            }

            callObj.on('member.updated.noiseSuppression', (eventParams) => {
              if (
                eventParams.member.member_id === params.memberId &&
                eventParams.member.updated.includes('noise_suppression') &&
                eventParams.member.noise_suppression === false
              ) {
                resolve(true)
              }
            })
          })
        },
        assertionFn: (result) => {
          expect(result, 'noise suppression updated event should resolve').toBe(
            true
          )
        },
        message: 'expect member updated noise suppression event',
      })

      // Trigger the audio flags change
      await expectPageEvalToPass(page, {
        evaluateFn: async () => {
          const callObj = window._callObj

          if (!callObj) {
            throw new Error('Call object not found')
          }

          await callObj.setAudioFlags({
            autoGain: false,
            echoCancellation: false,
            noiseSuppression: false,
          })
          return true
        },
        assertionFn: (result) => {
          expect(result, 'audio flags should be set successfully').toBe(true)
        },
        message: 'expect audio flags to be set',
      })

      // Wait for all events to complete
      await memberUpdatedEvent
      await memberUpdatedAutoGainEvent
      await memberUpdatedEchoCancellationEvent
      await memberUpdatedNoiseSuppressionEvent
    })

    await test.step('reload page and reattach', async () => {
      await page.reload({ waitUntil: 'domcontentloaded' })
      await createCFClient(page)

      // Set up the reattach call
      await expectPageEvalToPass(page, {
        evaluateArgs: { roomName },
        evaluateFn: async (params) => {
          const client = window._client

          if (!client) {
            throw new Error('Client not found')
          }

          const call = client.reattach({
            to: `/public/${params.roomName}?channel=video`,
            rootElement: document.getElementById('rootElement'),
          })

          window._callObj = call
          return true
        },
        assertionFn: (result) => {
          expect(result, 'reattach call should be created successfully').toBe(
            true
          )
        },
        message: 'expect reattach call to be created',
      })

      // Set up listener for call.joined event
      const callJoinedEvent = expectPageEvalToPass(page, {
        evaluateFn: () => {
          return new Promise<CallJoinedEventParams>((resolve) => {
            const call = window._callObj

            if (!call) {
              throw new Error('Call object not found')
            }

            call.on('call.joined', (params) => resolve(params))
          })
        },
        assertionFn: (result) => {
          expect(result, 'call joined event should be received').toBeDefined()
          expect(
            result.room_session,
            'call joined should include room session'
          ).toBeDefined()
        },
        message: 'expect call joined event',
      })

      // Start the reattach call
      await expectPageEvalToPass(page, {
        evaluateFn: async () => {
          const call = window._callObj

          if (!call) {
            throw new Error('Call object not found')
          }

          await call.start()
          return true
        },
        assertionFn: (result) => {
          expect(result, 'call should start successfully').toBe(true)
        },
        message: 'expect reattach call to start',
      })

      // Wait for the call.joined event to complete
      roomSessionAfter = await callJoinedEvent
    })

    await test.step('assert room state', async () => {
      expect(
        roomSessionAfter.room_session,
        'room session after reattach should be defined'
      ).toBeDefined()
      expect(
        roomSessionAfter.call_id,
        'call ID should match original call'
      ).toEqual(roomSessionBefore.call_id)

      const selfMember = roomSessionAfter.room_session.members.find(
        (member) => member.member_id === roomSessionAfter.member_id
      )

      expect(selfMember, 'self member should be found').toBeDefined()
      expect(
        selfMember?.auto_gain,
        'auto gain should be false after reattach'
      ).toBe(false)
      expect(
        selfMember?.echo_cancellation,
        'echo cancellation should be false after reattach'
      ).toBe(false)
      expect(
        selfMember?.noise_suppression,
        'noise suppression should be false after reattach'
      ).toBe(false)
    })
  })

  test('should join a room, update audio flags for other member, reload and reattach with correct states', async ({
    createCustomPage,
    resource,
  }) => {
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

    // --------------- Attach listeners on pageTwo ---------------
    const waitForMemberUpdatedEvents = pageTwo.evaluate((memberId) => {
      // @ts-expect-error
      const callObj: CallSession = window._callObj

      const memberUpdatedEvent = new Promise((res) => {
        callObj.on('member.updated', (params) => {
          if (
            params.member.member_id === memberId &&
            params.member.updated.includes('noise_suppression') &&
            params.member.updated.includes('echo_cancellation') &&
            params.member.updated.includes('auto_gain') &&
            params.member.auto_gain === false &&
            params.member.echo_cancellation === false &&
            params.member.noise_suppression === false
          ) {
            res(true)
          }
        })
      })
      const memberUpdatedAutoGainEvent = new Promise((res) => {
        callObj.on('member.updated.autoGain', (params) => {
          if (
            params.member.member_id === memberId &&
            params.member.updated.includes('auto_gain') &&
            params.member.auto_gain === false
          ) {
            res(true)
          }
        })
      })
      const memberUpdatedEchoCancellationEvent = new Promise((res) => {
        callObj.on('member.updated.echoCancellation', (params) => {
          if (
            params.member.member_id === memberId &&
            params.member.updated.includes('echo_cancellation') &&
            params.member.echo_cancellation === false
          ) {
            res(true)
          }
        })
      })
      const memberUpdatedNoiseSuppressionEvent = new Promise((res) => {
        callObj.on('member.updated.noiseSuppression', (params) => {
          if (
            params.member.member_id === memberId &&
            params.member.updated.includes('noise_suppression') &&
            params.member.noise_suppression === false
          ) {
            res(true)
          }
        })
      })

      return Promise.all([
        memberUpdatedEvent,
        memberUpdatedAutoGainEvent,
        memberUpdatedEchoCancellationEvent,
        memberUpdatedNoiseSuppressionEvent,
      ])
    }, memberTwoId)

    // --------------- Set audio flags (self) ---------------
    await test.step('[pageOne] change audio flags for memberTwo', async () => {
      await pageOne.evaluate(async (memberId) => {
        // @ts-expect-error
        const callObj: CallSession = window._callObj

        const memberUpdatedEvent = new Promise((res) => {
          callObj.on('member.updated', (params) => {
            if (
              params.member.member_id === memberId &&
              params.member.updated.includes('noise_suppression') &&
              params.member.updated.includes('echo_cancellation') &&
              params.member.updated.includes('auto_gain') &&
              params.member.auto_gain === false &&
              params.member.echo_cancellation === false &&
              params.member.noise_suppression === false
            ) {
              res(true)
            }
          })
        })
        const memberUpdatedAutoGainEvent = new Promise((res) => {
          callObj.on('member.updated.autoGain', (params) => {
            if (
              params.member.member_id === memberId &&
              params.member.updated.includes('auto_gain') &&
              params.member.auto_gain === false
            ) {
              res(true)
            }
          })
        })
        const memberUpdatedEchoCancellationEvent = new Promise((res) => {
          callObj.on('member.updated.echoCancellation', (params) => {
            if (
              params.member.member_id === memberId &&
              params.member.updated.includes('echo_cancellation') &&
              params.member.echo_cancellation === false
            ) {
              res(true)
            }
          })
        })
        const memberUpdatedNoiseSuppressionEvent = new Promise((res) => {
          callObj.on('member.updated.noiseSuppression', (params) => {
            if (
              params.member.member_id === memberId &&
              params.member.updated.includes('noise_suppression') &&
              params.member.noise_suppression === false
            ) {
              res(true)
            }
          })
        })

        await callObj.setAudioFlags({
          autoGain: false,
          echoCancellation: false,
          noiseSuppression: false,
          memberId,
        })

        return Promise.all([
          memberUpdatedEvent,
          memberUpdatedAutoGainEvent,
          memberUpdatedEchoCancellationEvent,
          memberUpdatedNoiseSuppressionEvent,
        ])
      }, memberTwoId)
    })

    await waitForMemberUpdatedEvents

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
              window._callObj = call
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

      const selfMember = roomSessionTwoAfter.room_session.members.find(
        (member) => member.member_id === roomSessionTwoAfter.member_id
      )

      expect(selfMember).toBeDefined()
      expect(selfMember?.auto_gain).toBe(false)
      expect(selfMember?.echo_cancellation).toBe(false)
      expect(selfMember?.noise_suppression).toBe(false)
    })
  })
})
