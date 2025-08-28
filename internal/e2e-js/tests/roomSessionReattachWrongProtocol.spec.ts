import { test, expect } from '../fixtures'
import type { Video } from '@signalwire/js'
import {
  SERVER_URL,
  createTestRoomSession,
  randomizeRoomName,
  expectMCUVisible,
  expectRoomJoinedEvent,
  joinRoom,
} from '../utils'

test.describe('RoomSessionReattachWrongProtocol', () => {
  test('should handle joining a room, reattaching with wrong protocol ID and then leaving the room', async ({
    createCustomPage,
  }) => {
    const page = await createCustomPage({ name: '[reattach-bad-auth]' })
    await page.goto(SERVER_URL)

    const roomName = randomizeRoomName()
    const permissions: any = []
    const connectionSettings = {
      vrt: {
        room_name: roomName,
        user_name: 'e2e_reattach_test_wrong_protocol',
        auto_create_room: true,
        permissions,
      },
      initialEvents: [],
    }
    await createTestRoomSession(page, connectionSettings)

    // --------------- Joining the room ---------------
    const joinedPromise = expectRoomJoinedEvent(page, {
      message: 'Waiting for room.joined (wrong protocol)',
    })
    await joinRoom(page, { message: 'Joining room (wrong protocol test)' })
    const joinParams = await joinedPromise

    expect(joinParams.room).toBeDefined()
    expect(joinParams.room_session).toBeDefined()
    expect(
      joinParams.room.members.some(
        (member: any) => member.id === joinParams.member_id
      )
    ).toBeTruthy()
    expect(joinParams.room_session.name).toBe(roomName)
    expect(joinParams.room.name).toBe(roomName)

    // Checks that the video is visible
    await expectMCUVisible(page)

    const roomPermissions: any = await page.evaluate(() => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj
      return roomObj.permissions
    })
    expect(roomPermissions).toStrictEqual(permissions)

    // --------------- Reattaching ---------------
    await page.reload()

    await createTestRoomSession(page, connectionSettings)

    // Try to join but expect to join with a different callId/memberId
    const reattachParams: any = await page.evaluate((roomName) => {
      console.log('Joining again room:', roomName)
      return new Promise((resolve) => {
        const roomObj = window._roomObj as Video.RoomSession
        roomObj.on('room.joined', resolve)

        // Inject wrong values for protocol ID
        const key = `pt-${roomName}`
        const state = btoa('wrong protocol')
        window.sessionStorage.setItem(key, state)
        console.log(`Injected protocol for ${key} with value ${state}`)

        return roomObj.join()
      })
    }, joinParams.room_session.name)

    expect(reattachParams.room).toBeDefined()
    expect(reattachParams.room_session).toBeDefined()
    expect(
      reattachParams.room.members.some(
        (member: any) => member.id === reattachParams.member_id
      )
    ).toBeTruthy()
    expect(reattachParams.room_session.name).toBe(roomName)
    expect(reattachParams.room.name).toBe(roomName)

    // Same room_session_id
    expect(reattachParams.room_session.id).toBe(joinParams.room_session.id)
    // Different memberId and callId
    expect(reattachParams.member_id).not.toBe(joinParams.member_id)
    expect(reattachParams.call_id).not.toBe(joinParams.call_id)

    // Checks that the video is visible
    await expectMCUVisible(page)
  })
})

// import { test, expect } from '../fixtures'
// import type { Video } from '@signalwire/js'
// import {
//   SERVER_URL,
//   createTestRoomSession,
//   randomizeRoomName,
//   expectMCUVisible,
//   expectRoomJoinWithDefaults,
//   expectPageEvalToPass,
// } from '../utils'

// test.describe('RoomSessionReattachWrongProtocol', () => {
//   test('should handle joining a room, reattaching with wrong protocol ID and then leaving the room', async ({
//     createCustomPage,
//   }) => {
//     const page = await createCustomPage({ name: '[reattach-bad-auth]' })
//     await page.goto(SERVER_URL)

//     const roomName = randomizeRoomName()
//     const permissions: any = []
//     const connectionSettings = {
//       vrt: {
//         room_name: roomName,
//         user_name: 'e2e_reattach_test_wrong_protocol',
//         auto_create_room: true,
//         permissions,
//       },
//       initialEvents: [],
//     }
//     await createTestRoomSession(page, connectionSettings)

//     // --------------- Joining the room ---------------
//     const joinParams: any = await expectRoomJoinWithDefaults(page)
//     console.log('>> room is joined', joinParams)

//     expect(joinParams.room).toBeDefined()
//     expect(joinParams.room_session).toBeDefined()
//     expect(
//       joinParams.room.members.some(
//         (member: any) => member.id === joinParams.member_id
//       )
//     ).toBeTruthy()
//     expect(joinParams.room_session.name).toBe(roomName)
//     expect(joinParams.room.name).toBe(roomName)

//     // Checks that the video is visible
//     await expectMCUVisible(page)

//     await expectPageEvalToPass(page, {
//       evaluateFn: () => {
//         const roomObj = window._roomObj as Video.RoomSession
//         return roomObj.permissions
//       },
//       assertionFn: (roomPermissions) =>
//         expect(roomPermissions).toStrictEqual(permissions),
//       message: 'Expected room permissions to match',
//     })

//     // --------------- Reattaching ---------------
//     await page.reload()
//     console.log('>> page reloaded')

//     await createTestRoomSession(page, connectionSettings)

//     // Try to join but expect to join with a different callId/memberId
//     // const reattachParams: any = await page.evaluate((roomName) => {
//     //   console.log('Joining again room:', roomName)
//     //   return new Promise((resolve) => {
//     //     const roomObj = window._roomObj as Video.RoomSession
//     //     roomObj.on('room.joined', resolve)

//     //     // Inject wrong values for protocol ID
//     //     const key = `pt-${roomName}`
//     //     const state = btoa('wrong protocol')
//     //     window.sessionStorage.setItem(key, state)
//     //     console.log(`Injected protocol for ${key} with value ${state}`)

//     //     return roomObj.join()
//     //   })
//     // }, joinParams.room_session.name)

//     console.log('>> calling reattach')
//     const reattachParams: any = await expectPageEvalToPass(page, {
//       evaluateArgs: joinParams.room_session.name,
//       evaluateFn: (roomName) => {
//         console.log('Joining again room:', roomName)
//         return new Promise((resolve) => {
//           const roomObj = window._roomObj as Video.RoomSession
//           roomObj.on('room.joined', resolve)

//           // Inject wrong values for protocol ID
//           const key = `pt-${roomName}`
//           const state = 'wrong protocol'
//           window.sessionStorage.setItem(key, state)
//           console.log(`Injected protocol for ${key} with value ${state}`)

//           return roomObj.join()
//         })
//       },
//       assertionFn: (params) => {
//         console.log('>> reattachParams', params)
//         expect(params).toBeDefined()
//       },
//       message: 'Expected to rejoin with new protocol state',
//       timeoutMs: 30_000,
//       interval: [30_000],
//     })

//     expect(reattachParams.room).toBeDefined()
//     expect(reattachParams.room_session).toBeDefined()
//     expect(
//       reattachParams.room.members.some(
//         (member: any) => member.id === reattachParams.member_id
//       )
//     ).toBeTruthy()
//     expect(reattachParams.room_session.name).toBe(roomName)
//     expect(reattachParams.room.name).toBe(roomName)

//     // Same room_session_id
//     expect(reattachParams.room_session.id).toBe(joinParams.room_session.id)
//     // Different memberId and callId
//     expect(reattachParams.member_id).not.toBe(joinParams.member_id)
//     expect(reattachParams.call_id).not.toBe(joinParams.call_id)

//     // Checks that the video is visible
//     await expectMCUVisible(page)
//   })
// })
