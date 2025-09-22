import { uuid } from '@signalwire/core'
import { CallJoinedEventParams, isCallSession } from '@signalwire/client'
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

          const call = await client.reattach({
            to: `/public/${params.roomName}?channel=video`,
            rootElement: document.getElementById('rootElement'),
          })

          window._callObj = call
          return isCallSession(call)
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
    let pageOne = {} as CustomPage
    let pageTwo = {} as CustomPage
    let roomName = ''
    let roomSessionOne = {} as CallJoinedEventParams
    let roomSessionTwo = {} as CallJoinedEventParams
    let roomSessionTwoAfter = {} as CallJoinedEventParams
    let memberOneId = ''
    let memberTwoId = ''

    // Scoped variables for pageTwo event promises
    let pageTwoMemberUpdatedEvent: Promise<boolean>
    let pageTwoMemberUpdatedAutoGainEvent: Promise<boolean>
    let pageTwoMemberUpdatedEchoCancellationEvent: Promise<boolean>
    let pageTwoMemberUpdatedNoiseSuppressionEvent: Promise<boolean>

    await test.step('setup pages and room', async () => {
      pageOne = await createCustomPage({ name: '[pageOne]' })
      pageTwo = await createCustomPage({ name: '[pageTwo]' })
      await pageOne.goto(SERVER_URL)
      await pageTwo.goto(SERVER_URL)

      roomName = `e2e_${uuid()}`
      await resource.createVideoRoomResource(roomName)
    })

    await test.step('[pageOne] create client and join room', async () => {
      await createCFClient(pageOne)

      roomSessionOne = await dialAddress(pageOne, {
        address: `/public/${roomName}?channel=video`,
      })

      expect(
        roomSessionOne.room_session,
        'pageOne room session should be defined'
      ).toBeDefined()
      expect(
        roomSessionOne.room_session.members,
        'pageOne should have members array'
      ).toBeDefined()
      expect(
        roomSessionOne.room_session.members,
        'pageOne should have 1 member'
      ).toHaveLength(1)
      await expectMCUVisible(pageOne)
    })

    await test.step('[pageTwo] create client and join room', async () => {
      await createCFClient(pageTwo)

      roomSessionTwo = await dialAddress(pageTwo, {
        address: `/public/${roomName}?channel=video`,
      })

      expect(
        roomSessionTwo.room_session,
        'pageTwo room session should be defined'
      ).toBeDefined()
      expect(
        roomSessionTwo.room_session.members,
        'pageTwo should have members array'
      ).toBeDefined()
      expect(
        roomSessionTwo.room_session.members,
        'pageTwo should have 2 members'
      ).toHaveLength(2)
      await expectMCUVisible(pageTwo)

      const memberIds = roomSessionTwo.room_session.members.map(
        (member) => member.member_id
      )
      memberOneId = memberIds[0]
      memberTwoId = memberIds[1]

      expect(memberOneId, 'member one ID should be defined').toBeDefined()
      expect(memberTwoId, 'member two ID should be defined').toBeDefined()
    })

    await test.step('[pageTwo] setup event listeners for member updates', async () => {
      // Set up listeners on pageTwo to detect when pageOne changes memberTwo's audio flags
      pageTwoMemberUpdatedEvent = expectPageEvalToPass(pageTwo, {
        evaluateArgs: { memberId: memberTwoId },
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
          expect(result, 'pageTwo member updated event should resolve').toBe(
            true
          )
        },
        message: 'expect pageTwo member updated event',
      })

      pageTwoMemberUpdatedAutoGainEvent = expectPageEvalToPass(pageTwo, {
        evaluateArgs: { memberId: memberTwoId },
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
          expect(result, 'pageTwo auto gain updated event should resolve').toBe(
            true
          )
        },
        message: 'expect pageTwo member updated auto gain event',
      })

      pageTwoMemberUpdatedEchoCancellationEvent = expectPageEvalToPass(
        pageTwo,
        {
          evaluateArgs: { memberId: memberTwoId },
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
            expect(
              result,
              'pageTwo echo cancellation updated event should resolve'
            ).toBe(true)
          },
          message: 'expect pageTwo member updated echo cancellation event',
        }
      )

      pageTwoMemberUpdatedNoiseSuppressionEvent = expectPageEvalToPass(
        pageTwo,
        {
          evaluateArgs: { memberId: memberTwoId },
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
            expect(
              result,
              'pageTwo noise suppression updated event should resolve'
            ).toBe(true)
          },
          message: 'expect pageTwo member updated noise suppression event',
        }
      )
    })

    await test.step('[pageOne] change audio flags for memberTwo', async () => {
      // Set up listeners on pageOne for the audio flag changes it will make
      const pageOneMemberUpdatedEvent = expectPageEvalToPass(pageOne, {
        evaluateArgs: { memberId: memberTwoId },
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
          expect(result, 'pageOne member updated event should resolve').toBe(
            true
          )
        },
        message: 'expect pageOne member updated event',
      })

      const pageOneMemberUpdatedAutoGainEvent = expectPageEvalToPass(pageOne, {
        evaluateArgs: { memberId: memberTwoId },
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
          expect(result, 'pageOne auto gain updated event should resolve').toBe(
            true
          )
        },
        message: 'expect pageOne member updated auto gain event',
      })

      const pageOneMemberUpdatedEchoCancellationEvent = expectPageEvalToPass(
        pageOne,
        {
          evaluateArgs: { memberId: memberTwoId },
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
            expect(
              result,
              'pageOne echo cancellation updated event should resolve'
            ).toBe(true)
          },
          message: 'expect pageOne member updated echo cancellation event',
        }
      )

      const pageOneMemberUpdatedNoiseSuppressionEvent = expectPageEvalToPass(
        pageOne,
        {
          evaluateArgs: { memberId: memberTwoId },
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
            expect(
              result,
              'pageOne noise suppression updated event should resolve'
            ).toBe(true)
          },
          message: 'expect pageOne member updated noise suppression event',
        }
      )

      // Trigger the audio flags change for memberTwo
      await expectPageEvalToPass(pageOne, {
        evaluateArgs: { memberId: memberTwoId },
        evaluateFn: async (params) => {
          const callObj = window._callObj

          if (!callObj) {
            throw new Error('Call object not found')
          }

          await callObj.setAudioFlags({
            autoGain: false,
            echoCancellation: false,
            noiseSuppression: false,
            memberId: params.memberId,
          })
          return true
        },
        assertionFn: (result) => {
          expect(
            result,
            'audio flags should be set successfully for memberTwo'
          ).toBe(true)
        },
        message: 'expect audio flags to be set for memberTwo',
      })

      // Wait for all pageOne events to complete
      await pageOneMemberUpdatedEvent
      await pageOneMemberUpdatedAutoGainEvent
      await pageOneMemberUpdatedEchoCancellationEvent
      await pageOneMemberUpdatedNoiseSuppressionEvent

      // Wait for all pageTwo events to complete
      await pageTwoMemberUpdatedEvent
      await pageTwoMemberUpdatedAutoGainEvent
      await pageTwoMemberUpdatedEchoCancellationEvent
      await pageTwoMemberUpdatedNoiseSuppressionEvent
    })

    await test.step('[pageTwo] reload page and reattach', async () => {
      await pageTwo.reload({ waitUntil: 'domcontentloaded' })
      await createCFClient(pageTwo)

      // Set up the reattach call
      await expectPageEvalToPass(pageTwo, {
        evaluateArgs: { roomName },
        evaluateFn: async (params) => {
          const client = window._client

          if (!client) {
            throw new Error('Client not found')
          }

          const call = await client.reattach({
            to: `/public/${params.roomName}?channel=video`,
            rootElement: document.getElementById('rootElement'),
          })

          window._callObj = call
          return isCallSession(call)
        },
        assertionFn: (result) => {
          expect(
            result,
            'pageTwo reattach call should be created successfully'
          ).toBe(true)
        },
        message: 'expect pageTwo reattach call to be created',
      })

      // Set up listener for call.joined event
      const callJoinedEvent = expectPageEvalToPass(pageTwo, {
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
          expect(
            result,
            'pageTwo call joined event should be received'
          ).toBeDefined()
          expect(
            result.room_session,
            'pageTwo call joined should include room session'
          ).toBeDefined()
        },
        message: 'expect pageTwo call joined event',
      })

      // Start the reattach call
      await expectPageEvalToPass(pageTwo, {
        evaluateFn: async () => {
          const call = window._callObj

          if (!call) {
            throw new Error('Call object not found')
          }

          await call.start()
          return true
        },
        assertionFn: (result) => {
          expect(result, 'pageTwo call should start successfully').toBe(true)
        },
        message: 'expect pageTwo reattach call to start',
      })

      // Wait for the call.joined event to complete
      roomSessionTwoAfter = await callJoinedEvent
    })

    await test.step('[pageTwo] assert room state', async () => {
      expect(
        roomSessionTwoAfter.room_session,
        'pageTwo room session after reattach should be defined'
      ).toBeDefined()
      expect(
        roomSessionTwoAfter.call_id,
        'pageTwo call ID should match original call'
      ).toEqual(roomSessionTwo.call_id)

      const selfMember = roomSessionTwoAfter.room_session.members.find(
        (member) => member.member_id === roomSessionTwoAfter.member_id
      )

      expect(selfMember, 'pageTwo self member should be found').toBeDefined()
      expect(
        selfMember?.auto_gain,
        'pageTwo auto gain should be false after reattach'
      ).toBe(false)
      expect(
        selfMember?.echo_cancellation,
        'pageTwo echo cancellation should be false after reattach'
      ).toBe(false)
      expect(
        selfMember?.noise_suppression,
        'pageTwo noise suppression should be false after reattach'
      ).toBe(false)
    })
  })
})
