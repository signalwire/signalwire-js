import { test, expect } from '../fixtures'
import type { Video } from '@signalwire/js'
import {
  SERVER_URL,
  createTestRoomSession,
  expectRoomJoined,
  expectMCUVisible,
  createOrUpdateRoom,
  createStreamForRoom,
  randomizeRoomName
} from '../utils'

test.describe('RoomSession', () => {

  const streamingURL = `${process.env.RTMP_SERVER}${process.env.RTMP_STREAM_NAME}`

  test('Should Join a Room with existing stream', async ({
    createCustomPage,
  }) => {

    const roomName = randomizeRoomName()

    const connectionSettings = {
      vrt: {
        room_name: roomName,
        user_name: 'e2e_test',
        auto_create_room: false,
        permissions: ['room.stream'],
      },
      initialEvents: ['stream.started', 'stream.ended'],
    }
    
    const pageOne = await createCustomPage({ name: '[pageOne]' })
    pageOne.goto(SERVER_URL)

    await createOrUpdateRoom({ name: roomName })
    await createStreamForRoom(roomName, streamingURL)

    await createTestRoomSession(pageOne, connectionSettings)

    await expectRoomJoined(pageOne)

    await expectMCUVisible(pageOne)

    let streamsResult  = await pageOne.evaluate(() => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj
      return roomObj.getStreams()
    })

    expect(streamsResult.streams).toHaveLength(1)

  });
})
