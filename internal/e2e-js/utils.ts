import type { Video } from '@signalwire/js'
import { createServer } from 'vite'
import path from 'path'
import { Page, expect } from '@playwright/test'
import fetch from 'node-fetch'
import { v4 as uuid } from 'uuid'

type CreateTestServerOptions = {
  target: 'heroku' | 'blank'
}

const TARGET_ROOT_PATH: Record<
  CreateTestServerOptions['target'],
  {
    path: string
    port: number
  }
> = {
  blank: { path: './templates/blank', port: 1337 },
  heroku: {
    path: path.dirname(
      require.resolve('@sw-internal/playground-js/src/heroku/index.html')
    ),
    port: 1336,
  },
}

export const SERVER_URL = 'http://localhost:1337'

export const createTestServer = async (
  options: CreateTestServerOptions = { target: 'blank' }
) => {
  const targetOptions = TARGET_ROOT_PATH[options.target]
  const server = await createServer({
    configFile: false,
    root: targetOptions.path,
    server: {
      port: targetOptions.port,
    },
    logLevel: 'silent',
  })

  return {
    start: async () => {
      await server.listen()
    },
    close: async () => {
      await server.close()
    },
    url: `http://localhost:${targetOptions.port}`,
  }
}

export const createTestRoomSession = async (
  page: Page,
  options: {
    vrt: CreateTestVRTOptions
    /** set of events to automatically subscribe before room.join() */
    initialEvents?: string[]
    expectToJoin?: boolean
    roomSessionOptions?: Record<string, any>
  }
) => {
  const vrt = await createTestVRTToken(options.vrt)
  if (!vrt) {
    console.error('Invalid VRT. Exiting..')
    process.exit(4)
  }
  const roomSession: Video.RoomSession = await page.evaluate(
    (options) => {
      // @ts-expect-error
      const Video = window._SWJS.Video
      const roomSession = new Video.RoomSession({
        host: options.RELAY_HOST,
        token: options.API_TOKEN,
        rootElement: document.getElementById('rootElement'),
        logLevel: options.CI ? 'warn' : 'debug',
        debug: {
          logWsTraffic: !options.CI,
        },
        ...options.roomSessionOptions,
      })

      options.initialEvents?.forEach((event) => {
        roomSession.once(event, () => {})
      })

      // @ts-expect-error
      window._roomObj = roomSession

      return Promise.resolve(roomSession)
    },
    {
      RELAY_HOST: process.env.RELAY_HOST,
      API_TOKEN: vrt,
      initialEvents: options.initialEvents,
      CI: process.env.CI,
      roomSessionOptions: options.roomSessionOptions,
    }
  )

  if (options.expectToJoin !== false) {
    expectRoomJoined(page, { invokeJoin: false }).then(async (params) => {
      await expectMemberId(page, params.member_id)

      const dir = options.vrt.join_as === 'audience' ? 'recvonly' : 'sendrecv'
      await expectSDPDirection(page, dir, true)

      const mode = options.vrt.join_as === 'audience' ? 'audience' : 'member'
      await expectInteractivityMode(page, mode)
    })
  }

  return roomSession
}

interface CreateTestVRTOptions {
  room_name: string
  user_name: string
  room_display_name?: string
  permissions?: string[]
  join_from?: number | string
  join_until?: number | string
  remove_at?: number | string
  remove_after_seconds_elapsed?: number
  auto_create_room?: boolean
  join_as?: 'member' | 'audience'
  media_allowed?: 'audio-only' | 'video-only' | 'all'
  join_audio_muted?: boolean
  join_video_muted?: boolean
}

export const createTestVRTToken = async (body: CreateTestVRTOptions) => {
  const authCreds = `${process.env.RELAY_PROJECT}:${process.env.RELAY_TOKEN}`
  const response = await fetch(
    `https://${process.env.API_HOST}/api/video/room_tokens`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(authCreds).toString('base64')}`,
      },
      body: JSON.stringify(body),
    }
  )
  const data = await response.json()
  return data.token
}

interface CreateTestCRTOptions {
  ttl: number
  member_id: string
  state: Record<string, any>
  channels: Record<string, { read?: boolean; write?: boolean }>
}

export const createTestCRTToken = async (body: CreateTestCRTOptions) => {
  const authCreds = `${process.env.RELAY_PROJECT}:${process.env.RELAY_TOKEN}`
  const response = await fetch(
    `https://${process.env.API_HOST}/api/chat/tokens`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(authCreds).toString('base64')}`,
      },
      body: JSON.stringify(body),
    }
  )
  const data = await response.json()
  return data.token
}

export const enablePageLogs = (page: Page, customMsg: string = '[page]') => {
  page.on('console', (log) => console.log(customMsg, log))
}

export const expectSDPDirection = async (
  page: Page,
  direction: string,
  value: boolean
) => {
  const peerSDP = await page.evaluate(async () => {
    // @ts-expect-error
    const roomObj: Video.RoomSession = window._roomObj
    // @ts-expect-error
    return roomObj.peer.localSdp
  })

  expect(peerSDP.split('m=')[1].includes(direction)).toBe(value)
  expect(peerSDP.split('m=')[2].includes(direction)).toBe(value)
}

export const expectInteractivityMode = async (
  page: Page,
  mode: 'member' | 'audience'
) => {
  const interactivityMode = await page.evaluate(async () => {
    // @ts-expect-error
    const roomObj: Video.RoomSession = window._roomObj
    return roomObj.interactivityMode
  })

  expect(interactivityMode).toEqual(mode)
}

export const expectLayoutChanged = (page: Page, layoutName: string) => {
  return page.evaluate(
    (options) => {
      return new Promise((resolve) => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj
        roomObj.on('layout.changed', ({ layout }: any) => {
          if (layout.name === options.layoutName) {
            resolve(true)
          }
        })
      })
    },
    { layoutName }
  )
}

export const setLayoutOnPage = (page: Page, layoutName: string) => {
  return page.evaluate(
    async (options) => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj
      return await roomObj.setLayout({ name: options.layoutName })
    },
    { layoutName }
  )
}

export const expectRoomJoined = (
  page: Page,
  options: { invokeJoin: boolean } = { invokeJoin: true }
) => {
  return page.evaluate(({ invokeJoin }) => {
    return new Promise<any>(async (resolve) => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj
      roomObj.once('room.joined', resolve)

      if (invokeJoin) {
        await roomObj.join()
      }
    })
  }, options)
}

export const expectMCUVisible = async (page: Page) => {
  await page.waitForSelector('div[id^="sw-sdk-"] > video')
}

export const expectMCUVisibleForAudience = async (page: Page) => {
  await page.waitForSelector('#rootElement video')
}

export const randomizeRoomName = (prefix: string = 'e2e') => {
  return `${prefix}${uuid()}`
}

export const expectMemberId = async (page: Page, memberId: string) => {
  const roomMemberId = await page.evaluate(async () => {
    // @ts-expect-error
    const roomObj: Video.RoomSession = window._roomObj
    return roomObj.memberId
  })

  expect(roomMemberId).toEqual(memberId)
}

export const expectMemberTalkingEvent = (page: Page) => {
  return page.evaluate(async () => {
    return new Promise((resolve) => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj
      roomObj.on('member.talking', resolve)
    })
  })
}

export const expectTotalAudioEnergyToBeGreaterThan = async (
  page: Page,
  value: number
) => {
  const audioStats = await page.evaluate(async () => {
    // @ts-expect-error
    const roomObj: Video.RoomSession = window._roomObj

    // @ts-expect-error
    const audioTrackId = roomObj.peer._getReceiverByKind('audio').track.id

    // @ts-expect-error
    const stats = await roomObj.peer.instance.getStats(null)
    const filter = {
      'inbound-rtp': [
        'audioLevel',
        'totalAudioEnergy',
        'totalSamplesDuration',
        'totalSamplesReceived',
        'packetsDiscarded',
        'lastPacketReceivedTimestamp',
        'bytesReceived',
        'packetsReceived',
        'packetsLost',
        'packetsRetransmitted',
      ],
    }
    const result: any = {}
    Object.keys(filter).forEach((entry) => {
      result[entry] = {}
    })

    stats.forEach((report: any) => {
      for (const [key, value] of Object.entries(filter)) {
        if (report.type == key &&
          report["mediaType"] === "audio" &&
          report["trackIdentifier"] === audioTrackId) {
          value.forEach((entry) => {
            if (report[entry]) {
              result[key][entry] = report[entry]
            }
          })
        }
      }
    }, {})

    return result
  })
  console.log('audioStats', audioStats)

  expect(audioStats['inbound-rtp']['totalAudioEnergy']).toBeGreaterThan(value)
}

const getRoomByName = async (roomName: string) => {
  const authCreds = `${process.env.RELAY_PROJECT}:${process.env.RELAY_TOKEN}`
  const response = await fetch(
    `https://${process.env.API_HOST}/api/video/rooms/${roomName}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(authCreds).toString('base64')}`,
      },
    }
  )
  if (response.status === 200) {
    return await response.json()
  }
  return undefined
}

export interface CreateOrUpdateRoomOptions {
  name: string
  display_name?: string
  max_members?: number
  quality?: '720p' | '1080p'
  join_from?: string
  join_until?: string
  remove_at?: string
  remove_after_seconds_elapsed?: number
  layout?: string
  record_on_start?: boolean
  enable_room_previews?: boolean
}

export const createOrUpdateRoom = async (body: CreateOrUpdateRoomOptions) => {
  const room = await getRoomByName(body.name)
  const authCreds = `${process.env.RELAY_PROJECT}:${process.env.RELAY_TOKEN}`
  const response = await fetch(
    `https://${process.env.API_HOST}/api/video/rooms${
      room ? `/${room.id}` : ''
    }`,
    {
      method: room ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(authCreds).toString('base64')}`,
      },
      body: JSON.stringify(body),
    }
  )
  const data = await response.json()
  return data
}

export const createStreamForRoom = async (name: string, url: string) => {
  const room = await getRoomByName(name)
  if (!room) {
    throw new Error('Room not found')
  }
  const authCreds = `${process.env.RELAY_PROJECT}:${process.env.RELAY_TOKEN}`

  const response = await fetch(
    `https://${process.env.API_HOST}/api/video/rooms/${room.id}/streams`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(authCreds).toString('base64')}`,
      },
      body: JSON.stringify({ url }),
    }
  )
  const data = await response.json()
  if (response.status !== 201) {
    throw data
  }

  // console.log('Room Data', data)
  return data
}

export const deleteRoom = async (id: string) => {
  const authCreds = `${process.env.RELAY_PROJECT}:${process.env.RELAY_TOKEN}`
  return await fetch(`https://${process.env.API_HOST}/api/video/rooms/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(authCreds).toString('base64')}`,
    },
  })
}

export const expectPageReceiveAudio = async (page: Page) => {
  await page.waitForTimeout(10000)
  await expectTotalAudioEnergyToBeGreaterThan(page, 0.5)
}
