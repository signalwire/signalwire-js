import { test, expect } from '../fixtures'
import type { Video } from '@signalwire/js'
import {
  SERVER_URL,
  createTestRoomSession,
  randomizeRoomName,
  expectRoomJoined,
  expectMCUVisible,
} from '../utils'

test.describe('RoomSession methods on non existing members', () => {
  test('should handle joining a room, try to perform actions on members that does not exist and then leave the room', async ({
    createCustomPage,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    const roomName = randomizeRoomName('e2e-non-existing-member')
    const member_permissions: string[] = [
      'room.member.audio_mute',
      'room.member.video_mute',
      'room.member.set_input_volume',
      'room.member.set_output_volume',
      'room.member.set_input_sensitivity',
      'room.member.set_meta',
      'room.member.remove',
      'room.member.promote',
      'room.member.demote',
    ]

    await createTestRoomSession(page, {
      vrt: {
        room_name: roomName,
        user_name: 'e2e_test_403',
        auto_create_room: true,
        permissions: member_permissions,
      },
      initialEvents: [],
    })

    // --------------- Joining the room ---------------
    const joinParams: any = await expectRoomJoined(page)

    expect(joinParams.room).toBeDefined()
    expect(joinParams.room_session).toBeDefined()
    expect(joinParams.room.name).toBe(roomName)

    // Checks that the video is visible, as audience
    await expectMCUVisible(page)

    const roomPermissions: any = await page.evaluate(() => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj
      return roomObj.permissions
    })
    expect(roomPermissions).toStrictEqual(member_permissions)

    // --------------- Muting Audio member and expecting 404 ---------------
    let errorCode: any = await page.evaluate(async () => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj
      const error = await roomObj
        .audioMute({
          memberId: 'non-exisisting-member',
        })
        .catch((error) => error)

      return error.jsonrpc.code
    })
    expect(errorCode).toBe('404')

    // --------------- Unmuting Audio member and expecting 403 ---------------
    errorCode = await page.evaluate(async () => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj
      const error = await roomObj
        .audioUnmute({
          memberId: 'non-exisisting-member',
        })
        .catch((error) => error)

      return error.jsonrpc.code
    })
    expect(errorCode).toBe('403')

    // --------------- Muting Video member and expecting 404 ---------------
    errorCode = await page.evaluate(async () => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj
      const error = await roomObj
        .videoMute({
          memberId: 'non-exisisting-member',
        })
        .catch((error) => error)

      return error.jsonrpc.code
    })
    expect(errorCode).toBe('404')

    // --------------- Unmuting Video member and expecting 403 ---------------
    errorCode = await page.evaluate(async () => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj
      const error = await roomObj
        .videoUnmute({
          memberId: 'non-exisisting-member',
        })
        .catch((error) => error)

      return error.jsonrpc.code
    })
    expect(errorCode).toBe('403')

    // --------------- Deaf member and expecting 403 ---------------
    errorCode = await page.evaluate(async () => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj
      const error = await roomObj
        .deaf({
          memberId: 'non-exisisting-member',
        })
        .catch((error) => error)

      return error.jsonrpc.code
    })
    expect(errorCode).toBe('403')

    // --------------- Undeaf member and expecting 403 ---------------
    errorCode = await page.evaluate(async () => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj
      const error = await roomObj
        .undeaf({
          memberId: 'non-exisisting-member',
        })
        .catch((error) => error)

      return error.jsonrpc.code
    })
    expect(errorCode).toBe('403')

    // --------------- set input volume for member and expecting 404 ---------------
    errorCode = await page.evaluate(async () => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj
      const error = await roomObj
        .setInputVolume({
          memberId: 'non-exisisting-member',
          volume: 25,
        })
        .catch((error) => error)

      return error.jsonrpc.code
    })
    expect(errorCode).toBe('404')

    // --------------- set output volume for member and expecting 404 ---------------
    errorCode = await page.evaluate(async () => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj
      const error = await roomObj
        .setOutputVolume({
          memberId: 'non-exisisting-member',
          volume: 25,
        })
        .catch((error) => error)

      return error.jsonrpc.code
    })
    expect(errorCode).toBe('404')

    // --------------- set input sensitivity for member and expecting 404 ---------------
    errorCode = await page.evaluate(async () => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj
      const error = await roomObj
        .setInputSensitivity({
          memberId: 'non-exisisting-member',
          value: 60,
        })
        .catch((error) => error)

      return error.jsonrpc.code
    })
    expect(errorCode).toBe('404')

    // --------------- set position member and expecting 403 ---------------
    errorCode = await page.evaluate(async () => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj
      const error = await roomObj
        .setMemberPosition({
          memberId: 'non-exisisting-member',
          position: 'reserved-1',
        })
        .catch((error) => error)

      return error.jsonrpc.code
    })
    expect(errorCode).toBe('403')

    // --------------- set meta for member and expecting 404 ---------------
    errorCode = await page.evaluate(async () => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj
      const error = await roomObj
        .setMemberMeta({
          memberId: 'non-exisisting-member',
          meta: {
            foo: 'bar',
          },
        })
        .catch((error) => error)

      return error.jsonrpc.code
    })
    expect(errorCode).toBe('404')

    // --------------- get meta for member and expecting 404 ---------------
    errorCode = await page.evaluate(async () => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj
      const error = await roomObj
        .getMemberMeta({
          memberId: 'non-exisisting-member',
        })
        .then(console.log)
        .catch((error) => error)

      return error.jsonrpc.code
    })
    expect(errorCode).toBe('404')

    // --------------- update meta for member and expecting 404 ---------------
    errorCode = await page.evaluate(async () => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj
      const error = await roomObj
        .updateMemberMeta({
          memberId: 'non-exisisting-member',
          meta: {
            foo2: 'bar2',
          },
        })
        .catch((error) => error)

      return error.jsonrpc.code
    })
    expect(errorCode).toBe('404')

    // --------------- delete meta for member and expecting 404 ---------------
    errorCode = await page.evaluate(async () => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj
      const error = await roomObj
        .deleteMemberMeta({
          memberId: 'non-exisisting-member',
          keys: ['foo', 'foo2'],
        })
        .catch((error) => error)

      return error.jsonrpc.code
    })
    expect(errorCode).toBe('404')

    // --------------- remove member and expecting 404 ---------------
    errorCode = await page.evaluate(async () => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj
      const error = await roomObj
        .removeMember({
          memberId: 'non-exisisting-member',
        })
        .catch((error) => error)

      return error.jsonrpc.code
    })
    expect(errorCode).toBe('404')

    // --------------- promote member and expecting 404 ---------------
    // errorCode = await page.evaluate(async () => {
    //   // @ts-expect-error
    //   const roomObj: Video.RoomSession = window._roomObj
    //   const error = await roomObj
    //     .promote({
    //       memberId: 'non-exisisting-member',
    //     })
    //     .catch((error) => error)
    //   console.log('promote error', error.jsonrpc.code, error.jsonrpc.message)
    //   return error.jsonrpc.code
    // })
    // expect(errorCode).toBe('404')

    // --------------- demote member and expecting 404 ---------------
    errorCode = await page.evaluate(async () => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj
      const error = await roomObj
        .demote({
          memberId: 'non-exisisting-member',
        })
        .catch((error) => error)

      return error.jsonrpc.code
    })
    expect(errorCode).toBe('404')
  })
})
