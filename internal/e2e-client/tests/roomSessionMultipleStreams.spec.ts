import { test, expect } from '../fixtures'
import type { Video } from '@signalwire/client'
import {
  SERVER_URL,
  createTestRoomSession,
  expectRoomJoined,
  expectMCUVisible,
  randomizeRoomName,
} from '../utils'

test.describe('Room Session Multiple Streams', () => {
  const MAX_STREAM_FOR_ENTERPRIZE = 5

  const streamingURL = `${process.env.RTMP_SERVER}${process.env.RTMP_STREAM_NAME}`

  const createStream = async ({ STREAMING_URL }: { STREAMING_URL: string }) => {
    // @ts-expect-error
    const roomObj: Video.RoomSession = window._roomObj

    const streamStarted = new Promise((resolve, reject) => {
      roomObj.on('stream.started', (params) => {
        if (params.state === 'streaming') {
          resolve(true)
        } else {
          reject(new Error('[stream.started] state is not "stream"'))
        }
      })
    })

    await roomObj.startStream({
      url: STREAMING_URL!,
    })

    return streamStarted
  }

  test('Should create multiple streams and list data about them all', async ({
    createCustomPage,
  }) => {
    const pageOne = await createCustomPage({ name: '[pageOnes]' })
    await pageOne.goto(SERVER_URL)

    const connectionSettings = {
      vrt: {
        room_name: randomizeRoomName('multi_stream_e2e'),
        user_name: 'e2e_test',
        auto_create_room: true,
        permissions: ['room.stream'],
      },
      initialEvents: ['stream.started', 'stream.ended'],
    }

    await createTestRoomSession(pageOne, connectionSettings)

    await expectRoomJoined(pageOne)

    await expectMCUVisible(pageOne)

    await pageOne.evaluate(createStream, { STREAMING_URL: `${streamingURL}_a` })
    let streamsResult = await pageOne.evaluate(() => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj
      return roomObj.getStreams()
    })
    expect(streamsResult.streams).toHaveLength(1)

    // This call will fail if test is executed using a "FREE" account, check this first in case of failures
    await pageOne.evaluate(createStream, { STREAMING_URL: `${streamingURL}_b` })
    streamsResult = await pageOne.evaluate(() => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj
      return roomObj.getStreams()
    })
    expect(streamsResult.streams).toHaveLength(2)
  })

  test('Should not create more the MAX_STREAM_FOR_ENTERPRIZE streams', async ({
    createCustomPage,
  }) => {
    const pageOne = await createCustomPage({ name: '[pageOnes]' })
    await pageOne.goto(SERVER_URL)

    const connectionSettings = {
      vrt: {
        room_name: randomizeRoomName('max_multi_stream_e2e'),
        user_name: 'e2e_test',
        auto_create_room: true,
        permissions: ['room.stream'],
      },
      initialEvents: ['stream.started', 'stream.ended'],
    }

    await createTestRoomSession(pageOne, connectionSettings)

    await expectRoomJoined(pageOne)

    await expectMCUVisible(pageOne)

    const streamNumbers = Array.from(
      { length: MAX_STREAM_FOR_ENTERPRIZE },
      (_, i) => i + 1
    )

    for (let streamNumber of streamNumbers) {
      await pageOne.evaluate(createStream, {
        STREAMING_URL: `${streamingURL}_${streamNumber}`,
      })
      let streamsResult = await pageOne.evaluate(() => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj
        return roomObj.getStreams()
      })
      // This call will fail if test is executed using an account other then "ENTERPRIZE", check this first in case of failures
      expect(streamsResult.streams).toHaveLength(streamNumber)
    }

    await expect(
      pageOne.evaluate(createStream, {
        STREAMING_URL: `${streamingURL}_${MAX_STREAM_FOR_ENTERPRIZE + 1}`,
      })
    ).rejects.toBeTruthy()
  })
})
