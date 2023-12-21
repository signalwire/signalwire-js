import { Page, Browser, expect } from '@playwright/test'
import { uuid } from '@signalwire/core'
import { SWClient, SignalWire } from '@signalwire/realtime-api'
import { SERVER_URL } from '../../utils'

const PERMISSIONS = [
  'room.self.audio_mute',
  'room.self.audio_unmute',
  'room.self.video_mute',
  'room.self.video_unmute',
  'room.self.deaf',
  'room.self.undeaf',
  'room.self.set_input_volume',
  'room.self.set_output_volume',
  'room.self.set_input_sensitivity',
  'room.list_available_layouts',
  'room.set_layout',
  'room.member.video_mute',
  'room.member.audio_mute',
  'room.member.remove',
  'room.recording',
  'room.playback',
  'room.playback_seek',
  'room.member.raisehand',
  'room.member.lowerhand',
  'room.self.raisehand',
  'room.self.lowerhand',
]

type CreateVRTParams = {
  room_name: string
  user_name: string
}

export const enablePageLogs = (page: Page, customMsg: string = '[page]') => {
  page.on('console', (log) => console.log(customMsg, log))
}

export const createTestVRTToken = async (body: CreateVRTParams) => {
  const authCreds = `${process.env.RELAY_PROJECT}:${process.env.RELAY_TOKEN}`
  const response = await fetch(
    `https://${process.env.API_HOST}/api/video/room_tokens`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(authCreds).toString('base64')}`,
      },
      body: JSON.stringify({ ...body, permissions: PERMISSIONS }),
    }
  )
  const data = await response.json()
  return data.token
}

type CreateRoomSessionParams = CreateVRTParams & {
  page: Page
  initialEvents?: string[]
}

export const createRoomSession = async (params: CreateRoomSessionParams) => {
  try {
    const { page, initialEvents, ...auth } = params

    const vrt = await createTestVRTToken(auth)

    return page.evaluate(
      (options) => {
        return new Promise<void>(async (resolve, reject) => {
          // @ts-expect-error
          const VideoSWJS = window._SWJS.Video
          const roomSession = new VideoSWJS.RoomSession({
            host: options.RELAY_HOST,
            token: options.API_TOKEN,
            audio: true,
            video: true,
            debug: { logWsTraffic: true },
          })

          // @ts-expect-error
          window._roomObj = roomSession

          roomSession.on('room.joined', async (room) => {
            // @ts-expect-error
            window._roomOnJoined = room

            resolve(room)
          })

          options.initialEvents?.forEach((event) => {
            roomSession.once(event, () => {})
          })

          await roomSession.join().catch((error) => {
            console.log('Error joining room', error)
            reject(error)
          })
        })
      },
      {
        RELAY_HOST: process.env.RELAY_HOST || 'relay.signalwire.com',
        API_TOKEN: vrt,
        initialEvents,
      }
    )
  } catch (error) {
    console.error('CreateRoomSession Error', error)
  }
}

type CreateNewTabRoomSessionParams = CreateVRTParams & {
  browser: Browser
  pageName: string
}

export const createRoomAndRecordPlay = async (
  params: CreateNewTabRoomSessionParams
): Promise<void> => {
  try {
    const { browser, pageName, ...auth } = params

    const page = await browser.newPage()
    await page.goto(SERVER_URL)
    enablePageLogs(page, pageName)

    const vrt = await createTestVRTToken(auth)

    return page.evaluate(
      (options) => {
        return new Promise<void>(async (resolve, reject) => {
          // @ts-expect-error
          const VideoSWJS = window._SWJS.Video
          const roomSession = new VideoSWJS.RoomSession({
            host: options.RELAY_HOST,
            token: options.API_TOKEN,
            audio: true,
            video: true,
            debug: { logWsTraffic: true },
          })

          console.log('Room created', roomSession.id)

          let waitForRecordStartResolve: (value: void) => void
          const waitForRecordStart = new Promise((resolve) => {
            waitForRecordStartResolve = resolve
          })
          let waitForPlaybackStartResolve: (value: void) => void
          const waitForPlaybackStart = new Promise((resolve) => {
            waitForPlaybackStartResolve = resolve
          })

          roomSession.on('recording.started', () => {
            console.log('Recording has started')
            waitForRecordStartResolve()
          })

          roomSession.on('playback.started', () => {
            console.log('Playback has started')
            waitForPlaybackStartResolve()
          })

          roomSession.on('room.joined', async () => {
            await roomSession.startRecording()
            await waitForRecordStart

            await roomSession.play({ url: options.PLAYBACK_URL })
            await waitForPlaybackStart

            resolve()
          })

          await roomSession.join().catch((error) => {
            console.log('Error joining room', error)
            reject(error)
          })
        })
      },
      {
        RELAY_HOST: process.env.RELAY_HOST || 'relay.signalwire.com',
        API_TOKEN: vrt,
        PLAYBACK_URL: process.env.PLAYBACK_URL,
      }
    )
  } catch (error) {
    console.error('CreateRoomSession Error', error)
  }
}

export const expectMemberUpdated = async ({ page, memberName }) => {
  return page.evaluate(
    ({ memberName }) => {
      return new Promise((resolve, _reject) => {
        // @ts-expect-error
        const roomSession = window._roomObj

        roomSession.on('member.updated', (room) => {
          if (room.member.name === memberName) {
            resolve(room.member)
          }
        })
      })
    },
    {
      memberName,
    }
  )
}

interface FindRoomSessionByPrefixParams {
  client: SWClient
  prefix: string
}

export const findRoomSessionByPrefix = async ({
  client,
  prefix,
}: FindRoomSessionByPrefixParams) => {
  const { roomSessions } = await client.video.getRoomSessions()
  return roomSessions.filter((r) => r.name.startsWith(prefix))
}

export const createRoomAndJoinTwoMembers = async (browser: Browser) => {
  const pageOne = await browser.newPage()
  const pageTwo = await browser.newPage()

  await Promise.all([pageOne.goto(SERVER_URL), pageTwo.goto(SERVER_URL)])

  enablePageLogs(pageOne, '[pageOne]')
  enablePageLogs(pageTwo, '[pageTwo]')

  // Create a realtime-api Video client
  const client = await SignalWire({
    host: process.env.RELAY_HOST,
    project: process.env.RELAY_PROJECT as string,
    token: process.env.RELAY_TOKEN as string,
    debug: { logWsTraffic: true },
  })

  const prefix = uuid()
  const roomName = `${prefix}-hand-raise-lower-e2e`
  const memberOneName = `${prefix}-member-one`
  const memberTwoName = `${prefix}-member-two`

  // Room length should be 0 before start
  const roomSessionsBeforeStart = await findRoomSessionByPrefix({
    client,
    prefix,
  })
  expect(roomSessionsBeforeStart).toHaveLength(0)

  // Create a room and join two members
  await Promise.all([
    createRoomSession({
      page: pageOne,
      room_name: roomName,
      user_name: memberOneName,
      initialEvents: ['member.updated'],
    }),
    createRoomSession({
      page: pageTwo,
      room_name: roomName,
      user_name: memberTwoName,
      initialEvents: ['member.updated'],
    }),
  ])

  // Room length should be 1 after start
  const roomSessionsAfterStart = await findRoomSessionByPrefix({
    client,
    prefix,
  })
  expect(roomSessionsAfterStart).toHaveLength(1)

  const roomSession = roomSessionsAfterStart[0]

  // There should be 2 members in the room
  const { members } = await roomSession.getMembers()
  expect(members).toHaveLength(2)

  const memberOne = members.find((member) => member.name === memberOneName)!
  const memberTwo = members.find((member) => member.name === memberTwoName)!

  // Expect both members instances to be defined
  expect(memberOne).toBeDefined()
  expect(memberTwo).toBeDefined()

  return {
    client,
    pageOne,
    pageTwo,
    memberOne,
    memberTwo,
    roomSession,
  }
}
