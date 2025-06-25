import { test, expect } from '../fixtures'
import {
  SERVER_URL,
  createTestRoomSession,
  createRoom,
  deleteRoom,
  CreateOrUpdateRoomOptions,
  randomizeRoomName,
  expectRoomJoined,
  expectRecordingStarted,
} from '../utils'

interface TestConfig {
  testName: string
  roomName: string
  roomSettings: Partial<CreateOrUpdateRoomOptions>
  expect(p: any): void
}
test.describe('Room Settings', () => {
  const tests: TestConfig[] = [
    {
      testName: 'should set the initial layout',
      roomName: randomizeRoomName('e2e-layout'),
      roomSettings: {
        layout: '10x10',
      },
      expect: (joinParams) => {
        expect(joinParams.room_session.layout_name).toEqual('10x10')
        expect(joinParams.room.layout_name).toEqual('10x10')
      },
    },
    {
      testName: 'should set auto-record and start recording',
      roomName: randomizeRoomName('e2e-auto-record'),
      roomSettings: {
        record_on_start: true,
      },
      expect: (params) => {
        // match either room.joined or recording.started events
        try {
          expect(params).toEqual(expect.objectContaining({
            room_session: expect.objectContaining({
              recording: true
            }),
            room: expect.objectContaining({
              recording: true
            })
          }))
        } catch(_e) {
          expect(params).toEqual(expect.objectContaining({
            state: 'recording'
          }))
        }
      },
    },
  ]

  tests.forEach((row) => {
    test(row.testName, async ({ createCustomPage }) => {
      const page = await createCustomPage({ name: '[page]' })
      await page.goto(SERVER_URL)

      const roomData = await createRoom({
        name: row.roomName,
        ...row.roomSettings,
      })

      await createTestRoomSession(page, {
        vrt: {
          room_name: row.roomName,
          user_name: 'member',
          auto_create_room: false,
          permissions: [],
        },
        initialEvents: [],
      })

      // --------------- wait for room.joined or recording.started event---------------
      let params = await Promise.race([
        expectRoomJoined(page),
        expectRecordingStarted(page)
      ])
      // Run custom expectations for each run
      row.expect(params)

      await deleteRoom(roomData.id)
    })
  })
})
