import { uuid } from '@signalwire/core'
import { CallSession, CallJoinedEventParams } from '@signalwire/client'
import { test, expect } from '../../fixtures'
import {
  SERVER_URL,
  createCFClient,
  dialAddress,
  expectMCUVisible,
} from '../../utils'

test.describe('CallCall Audio Flags', () => {
  test('should join a room, update audio flags for self member, reload and reattach with correct states', async ({
    createCustomPage,
    resource,
  }) => {
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

    // --------------- Set audio flags (self) ---------------
    await test.step('change audio flags', async () => {
      await page.evaluate(async (memberId) => {
        // @ts-expect-error
        const callObj: CallSession = window._callObj

        // Use Promise.withResolvers for better event handling
        const { promise: audioFlagsPromise, resolve: resolveAudioFlags } = Promise.withResolvers()

        let eventsReceived = 0
        const expectedEvents = 4 // member.updated + 3 specific events

        // Set up event listeners
        const handleMemberUpdate = (params: any) => {
          if (
            params.member.member_id === memberId &&
            params.member.updated.includes('noise_suppression') &&
            params.member.updated.includes('echo_cancellation') &&
            params.member.updated.includes('auto_gain') &&
            params.member.auto_gain === false &&
            params.member.echo_cancellation === false &&
            params.member.noise_suppression === false
          ) {
            eventsReceived++
            if (eventsReceived >= expectedEvents) {
              resolveAudioFlags(true)
            }
          }
        }

        const handleAutoGainUpdate = (params: any) => {
          if (
            params.member.member_id === memberId &&
            params.member.updated.includes('auto_gain') &&
            params.member.auto_gain === false
          ) {
            eventsReceived++
            if (eventsReceived >= expectedEvents) {
              resolveAudioFlags(true)
            }
          }
        }

        const handleEchoCancellationUpdate = (params: any) => {
          if (
            params.member.member_id === memberId &&
            params.member.updated.includes('echo_cancellation') &&
            params.member.echo_cancellation === false
          ) {
            eventsReceived++
            if (eventsReceived >= expectedEvents) {
              resolveAudioFlags(true)
            }
          }
        }

        const handleNoiseSuppressionUpdate = (params: any) => {
          if (
            params.member.member_id === memberId &&
            params.member.updated.includes('noise_suppression') &&
            params.member.noise_suppression === false
          ) {
            eventsReceived++
            if (eventsReceived >= expectedEvents) {
              resolveAudioFlags(true)
            }
          }
        }

        // Attach event listeners
        callObj.on('member.updated', handleMemberUpdate)
        callObj.on('member.updated.autoGain', handleAutoGainUpdate)
        callObj.on('member.updated.echoCancellation', handleEchoCancellationUpdate)
        callObj.on('member.updated.noiseSuppression', handleNoiseSuppressionUpdate)

        await callObj.setAudioFlags({
          autoGain: false,
          echoCancellation: false,
          noiseSuppression: false,
        })

        await audioFlagsPromise

        // Clean up listeners
        callObj.off('member.updated', handleMemberUpdate)
        callObj.off('member.updated.autoGain', handleAutoGainUpdate)
        callObj.off('member.updated.echoCancellation', handleEchoCancellationUpdate)
        callObj.off('member.updated.noiseSuppression', handleNoiseSuppressionUpdate)

        return true
      }, memberId)
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
              window._callObj = call
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

      const selfMember = roomSessionAfter.room_session.members.find(
        (member) => member.member_id === roomSessionAfter.member_id
      )

      expect(selfMember).toBeDefined()
      expect(selfMember?.auto_gain).toBe(false)
      expect(selfMember?.echo_cancellation).toBe(false)
      expect(selfMember?.noise_suppression).toBe(false)
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
