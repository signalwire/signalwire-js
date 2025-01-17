import type {
  FabricRoomSession,
  SignalWireContract,
  Video,
} from '@signalwire/js'
import type { MediaEventNames } from '@signalwire/webrtc'
import { createServer } from 'vite'
import path from 'path'
import { expect } from './fixtures'
import { Page } from '@playwright/test'
import { v4 as uuid } from 'uuid'

// #region Utilities for Playwright test server & fixture

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
export const BASIC_TOKEN = Buffer.from(
  `${process.env.RELAY_PROJECT}:${process.env.RELAY_TOKEN}`
).toString('base64')

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

export const enablePageLogs = (page: Page, customMsg: string = '[page]') => {
  page.on('console', (log) => console.log(customMsg, log))
}

// #endregion

// #region Utilities for Token Creation

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
  end_room_session_on_leave?: boolean
}

export const createTestVRTToken = async (body: CreateTestVRTOptions) => {
  const response = await fetch(
    `https://${process.env.API_HOST}/api/video/room_tokens`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${BASIC_TOKEN}`,
      },
      body: JSON.stringify(body),
    }
  )
  const data = await response.json()
  return data.token
}

interface CreateTestJWTOptions {
  resource?: string
  refresh_token?: string
}

export const createTestJWTToken = async (body: CreateTestJWTOptions) => {
  const response = await fetch(
    `https://${process.env.API_HOST}/api/relay/rest/jwt`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${BASIC_TOKEN}`,
      },
      body: JSON.stringify(body),
    }
  )
  const data = await response.json()
  return data.jwt_token
}

export const createTestSATToken = async () => {
  const response = await fetch(
    `https://${process.env.API_HOST}/api/fabric/subscribers/tokens`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${BASIC_TOKEN}`,
      },
      body: JSON.stringify({
        reference: process.env.SAT_REFERENCE,
      }),
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
  const response = await fetch(
    `https://${process.env.API_HOST}/api/chat/tokens`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${BASIC_TOKEN}`,
      },
      body: JSON.stringify(body),
    }
  )
  const data = await response.json()
  return data.token
}

// #endregion

// #region Utilities for RoomSession

export const createTestRoomSession = async (
  page: Page,
  options: {
    vrt: CreateTestVRTOptions
    /** set of events to automatically subscribe before room.join() */
    initialEvents?: string[]
    expectToJoin?: boolean
    roomSessionOptions?: Record<string, any>
    shouldPassRootElement?: boolean
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
        ...(options.shouldPassRootElement && {
          rootElement: document.getElementById('rootElement'),
        }),
        logLevel: options.CI ? 'info' : 'debug',
        debug: {
          logWsTraffic: true, //Boolean(options.CI),
        },
        ...options.roomSessionOptions,
      })

      options.initialEvents?.forEach((event) => {
        roomSession.once(event, () => {})
      })

      // @ts-expect-error
      window.jwt_token = options.API_TOKEN

      // @ts-expect-error
      window._roomObj = roomSession

      return Promise.resolve(roomSession)
    },
    {
      RELAY_HOST:
        options.vrt.join_as === 'audience'
          ? process.env.RELAY_AUDIENCE_HOST
          : process.env.RELAY_HOST,
      API_TOKEN: vrt,
      initialEvents: options.initialEvents,
      CI: process.env.CI,
      roomSessionOptions: options.roomSessionOptions,
      shouldPassRootElement: options.shouldPassRootElement ?? true,
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

export const createTestRoomSessionWithJWT = async (
  page: Page,
  options: {
    vrt: CreateTestVRTOptions
    /** set of events to automatically subscribe before room.join() */
    initialEvents?: string[]
    roomSessionOptions?: Record<string, any>
  },
  jwt: string
) => {
  if (!jwt) {
    console.error('Invalid JWT. Exiting..')
    process.exit(4)
  }
  return page.evaluate(
    (options) => {
      // @ts-expect-error
      const Video = window._SWJS.Video
      const roomSession = new Video.RoomSession({
        host: options.RELAY_HOST,
        token: options.API_TOKEN,
        rootElement: document.getElementById('rootElement'),
        audio: true,
        video: true,
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
      window.jwt_token = options.API_TOKEN

      // @ts-expect-error
      window._roomObj = roomSession

      return Promise.resolve(roomSession)
    },
    {
      RELAY_HOST:
        options.vrt.join_as === 'audience'
          ? process.env.RELAY_AUDIENCE_HOST
          : process.env.RELAY_HOST,
      API_TOKEN: jwt,
      initialEvents: options.initialEvents,
      CI: process.env.CI,
      roomSessionOptions: options.roomSessionOptions,
    }
  )
}

const getRoomByName = async (roomName: string) => {
  const response = await fetch(
    `https://${process.env.API_HOST}/api/video/rooms/${roomName}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${BASIC_TOKEN}`,
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
  if (!room) {
    return createRoom(body)
  }

  const response = await fetch(
    `https://${process.env.API_HOST}/api/video/rooms/${room.id}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${BASIC_TOKEN}`,
      },
      body: JSON.stringify(body),
    }
  )
  return response.json()
}

export const createRoom = async (body: CreateOrUpdateRoomOptions) => {
  const response = await fetch(
    `https://${process.env.API_HOST}/api/video/rooms`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${BASIC_TOKEN}`,
      },
      body: JSON.stringify(body),
    }
  )
  return response.json()
}

export const createStreamForRoom = async (name: string, url: string) => {
  const room = await getRoomByName(name)
  if (!room) {
    throw new Error('Room not found')
  }

  const response = await fetch(
    `https://${process.env.API_HOST}/api/video/rooms/${room.id}/streams`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${BASIC_TOKEN}`,
      },
      body: JSON.stringify({ url }),
    }
  )
  const data = await response.json()
  if (response.status !== 201) {
    throw data
  }

  return data
}

export const deleteRoom = async (id: string) => {
  return await fetch(`https://${process.env.API_HOST}/api/video/rooms/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${BASIC_TOKEN}`,
    },
  })
}

export const leaveRoom = async (page: Page) => {
  return page.evaluate(async () => {
    const roomObj: Video.RoomSession | FabricRoomSession =
      // @ts-expect-error
      window._roomObj
    console.log('Fixture roomObj', roomObj)
    if (roomObj && roomObj?.roomSessionId) {
      console.log('Fixture has room', roomObj.roomSessionId)
      await roomObj.leave()
    }

    return {
      videos: Array.from(document.querySelectorAll('video')).length,
      rootEl: document.getElementById('rootElement')?.childElementCount ?? 0,
    }
  })
}

// #endregion

// #region Utilities for Call Fabric client

export const createCFClient = async (page: Page) => {
  const sat = await createTestSATToken()
  if (!sat) {
    console.error('Invalid SAT. Exiting..')
    process.exit(4)
  }

  const swClient = await page.evaluate(
    async (options) => {
      // @ts-expect-error
      const SignalWire = window._SWJS.SignalWire
      const client: SignalWireContract = await SignalWire({
        host: options.RELAY_HOST,
        token: options.API_TOKEN,
        debug: { logWsTraffic: true },
      })

      // @ts-expect-error
      window._client = client
      return client
    },
    {
      RELAY_HOST: process.env.RELAY_HOST,
      API_TOKEN: sat,
    }
  )

  return swClient
}

interface DialAddressParams {
  address: string
  dialOptions?: Record<string, any>
  reattach?: boolean
  shouldWaitForJoin?: boolean
  shouldStartCall?: boolean
  shouldPassRootElement?: boolean
}
export const dialAddress = (page: Page, params: DialAddressParams) => {
  const {
    address,
    dialOptions = {},
    reattach = false,
    shouldPassRootElement = true,
    shouldStartCall = true,
    shouldWaitForJoin = true,
  } = params
  return page.evaluate(
    async ({
      address,
      dialOptions,
      reattach,
      shouldPassRootElement,
      shouldStartCall,
      shouldWaitForJoin,
    }) => {
      return new Promise<any>(async (resolve, _reject) => {
        // @ts-expect-error
        const client: SignalWireContract = window._client

        const dialer = reattach ? client.reattach : client.dial

        const call = await dialer({
          to: address,
          ...(shouldPassRootElement && {
            rootElement: document.getElementById('rootElement')!,
          }),
          ...dialOptions,
        })

        if (shouldWaitForJoin) {
          call.on('room.joined', resolve)
        }

        // @ts-expect-error
        window._roomObj = call

        if (shouldStartCall) {
          await call.start()
        }

        if (!shouldWaitForJoin) {
          resolve(call)
        }
      })
    },
    {
      address,
      dialOptions,
      reattach,
      shouldPassRootElement,
      shouldStartCall,
      shouldWaitForJoin,
    }
  )
}

export const disconnectClient = (page: Page) => {
  return page.evaluate(async () => {
    return new Promise<void>((resolve, _reject) => {
      // @ts-expect-error
      const client: SignalWireContract = window._client
      console.log('Fixture client', client)
      // @ts-expect-error
      if (!client || !client.__wsClient.sessionConnected) {
        console.log('Client not connected')
        resolve()
      } else {
        // @ts-expect-error
        client.__wsClient.clientApi.sessionEmitter.on(
          'session.disconnected',
          () => {
            console.log('Client has been disconnected')
            resolve()
          }
        )
        console.log('Disconnecting the client')
        client.disconnect()
      }
    })
  })
}

// #endregion

// #region Utilities for the MCU

export const expectMCUVisible = async (page: Page) => {
  await page.waitForSelector('div[id^="sw-sdk-"] > video')
}

export const expectMCUNotVisible = async (page: Page) => {
  const mcuVideo = await page.$('div[id^="sw-sdk-"] > video')
  expect(mcuVideo).toBeNull()
}

export const expectMCUVisibleForAudience = async (page: Page) => {
  await page.waitForSelector('#rootElement video')
}

// #endregion

// #region Utilities for RTP Media stats and SDP

export const getStats = async (page: Page) => {
  const stats = await page.evaluate(async () => {
    // @ts-expect-error
    const roomObj: Video.RoomSession = window._roomObj
    // @ts-expect-error
    const rtcPeer = roomObj.peer
    const stats = await rtcPeer.instance.getStats(null)
    const result: {
      inboundRTP: Record<any, any>
      outboundRTP: Record<any, any>
    } = { inboundRTP: {}, outboundRTP: {} }

    const inboundRTPFilters = {
      audio: ['packetsReceived', 'packetsLost', 'packetsDiscarded'],
      video: ['packetsReceived', 'packetsLost', 'packetsDiscarded'],
    } as const

    const inboundRTPHandler = (report: any) => {
      const media = report.mediaType as 'video' | 'audio'
      const trackId = rtcPeer._getReceiverByKind(media)!.track.id
      console.log(`getStats trackId "${trackId}" for media ${media}`)
      if (report.trackIdentifier !== trackId) {
        console.log(
          `trackIdentifier "${report.trackIdentifier}" and trackId "${trackId}" are different`
        )
        return
      }
      result.inboundRTP[media] = result.inboundRTP[media] || {}
      inboundRTPFilters[media].forEach((key) => {
        result.inboundRTP[media][key] = report[key]
      })
    }

    const outboundRTPFilters = {
      audio: ['active', 'packetsSent', 'targetBitrate', 'totalPacketSendDelay'],
      video: ['active', 'packetsSent', 'targetBitrate', 'totalPacketSendDelay'],
    } as const

    const outboundRTPHandler = (report: any) => {
      const media = report.mediaType as 'video' | 'audio'
      result.outboundRTP[media] = result.outboundRTP[media] || {}
      outboundRTPFilters[media].forEach((key) => {
        result.outboundRTP[media][key] = report[key]
      })
    }

    stats.forEach((report: any) => {
      switch (report.type) {
        case 'inbound-rtp':
          inboundRTPHandler(report)
          break
        case 'outbound-rtp':
          outboundRTPHandler(report)
          break
      }
    })

    return result
  })
  console.log('RTC Stats', stats)

  return stats
}

export const expectPageReceiveMedia = async (page: Page, delay = 5_000) => {
  const first = await getStats(page)
  await page.waitForTimeout(delay)
  const last = await getStats(page)

  const seconds = delay / 1000
  const minAudioPacketsExpected = 40 * seconds
  const minVideoPacketsExpected = 25 * seconds

  expect(last.inboundRTP.video?.packetsReceived).toBeGreaterThan(
    (first.inboundRTP.video?.packetsReceived || 0) + minVideoPacketsExpected
  )
  expect(last.inboundRTP.audio?.packetsReceived).toBeGreaterThan(
    (first.inboundRTP.audio?.packetsReceived || 0) + minAudioPacketsExpected
  )
}

export const getAudioStats = async (page: Page) => {
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
        if (
          report.type == key &&
          report['mediaType'] === 'audio' &&
          report['trackIdentifier'] === audioTrackId
        ) {
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

  return audioStats
}

export const expectTotalAudioEnergyToBeGreaterThan = async (
  page: Page,
  value: number
) => {
  const audioStats = await getAudioStats(page)

  const totalAudioEnergy = audioStats['inbound-rtp']['totalAudioEnergy']
  if (totalAudioEnergy) {
    expect(totalAudioEnergy).toBeGreaterThan(value)
  } else {
    console.log('Warning - totalAudioEnergy was not present in the audioStats.')
  }
}

export const expectPageReceiveAudio = async (page: Page) => {
  await page.waitForTimeout(10000)
  await expectTotalAudioEnergyToBeGreaterThan(page, 0.5)
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

export const getRemoteMediaIP = async (page: Page) => {
  const remoteIP: string = await page.evaluate(() => {
    // @ts-expect-error
    const peer: Video.RoomSessionPeer = window._roomObj.peer
    const lines = peer.instance?.remoteDescription?.sdp?.split('\r\n')
    const ipLine = lines?.find((line: any) => line.includes('c=IN IP4'))
    return ipLine?.split(' ')[2]
  })
  return remoteIP
}

// #endregion

// #region Utilities for v2 WebRTC testing

export const createCallWithCompatibilityApi = async (
  resource: string,
  inlineLaml: string,
  codecs?: string | undefined
) => {
  const data = new URLSearchParams()

  if (inlineLaml !== null && inlineLaml !== '') {
    data.append('Laml', inlineLaml)
  }
  data.append('From', `${process.env.VOICE_DIAL_FROM_NUMBER}`)

  const vertoDomain = process.env.VERTO_DOMAIN
  expect(vertoDomain).toBeDefined()

  let to = `verto:${resource}@${vertoDomain}`
  if (codecs) {
    to += `;codecs=${codecs}`
  }
  data.append('To', to)

  data.append('Record', 'true')
  data.append('RecordingChannels', 'dual')
  data.append('Trim', 'do-not-trim')

  console.log(
    'REST API URL: ',
    `https://${process.env.API_HOST}/api/laml/2010-04-01/Accounts/${process.env.RELAY_PROJECT}/Calls`
  )
  console.log('REST API payload: ', data)

  const response = await fetch(
    `https://${process.env.API_HOST}/api/laml/2010-04-01/Accounts/${process.env.RELAY_PROJECT}/Calls`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${BASIC_TOKEN}`,
      },
      body: data,
    }
  )

  if (Number.isInteger(Number(response.status)) && response.status !== null) {
    if (response.status !== 201) {
      const responseBody = await response.json()
      const formattedBody = JSON.stringify(responseBody, null, 2)

      console.log(
        'ERROR - response from REST API: ',
        response.status,
        ' status text = ',
        response.statusText,
        ' body = ',
        formattedBody
      )
    }
    return response.status
  }
  return undefined
}

export const getDialConferenceLaml = (conferenceNameBase: string) => {
  const conferenceName = randomizeRoomName(conferenceNameBase)
  const conferenceRegion = process.env.LAML_CONFERENCE_REGION ?? ''
  const inlineLaml = `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Dial>
        <Conference
          endConferenceOnExit="false"
          startConferenceOnEnter="true"
          waitUrl="https://cdn.signalwire.com/default-music/welcome.mp3"
          waitMethod="GET"
          ${conferenceRegion}>
          ${conferenceName}
        </Conference>
      </Dial>
    </Response>`

  return inlineLaml
}

export const expectv2HasReceivedAudio = async (
  page: Page,
  minTotalAudioEnergy: number,
  minPacketsReceived: number
) => {
  const audioStats = await page.evaluate(async () => {
    // @ts-expect-error
    const currentCall = window.__currentCall
    const audioReceiver = currentCall.peer.instance
      .getReceivers()
      .find((r: any) => r.track.kind === 'audio')

    const audioTrackId = audioReceiver.track.id

    const stats = await currentCall.peer.instance.getStats(null)
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
        if (
          report.type == key &&
          report['mediaType'] === 'audio' &&
          report['trackIdentifier'] === audioTrackId
        ) {
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
  console.log('audioStats: ', audioStats)

  /* This is a workaround what we think is a bug in Playwright/Chromium
   * There are cases where totalAudioEnergy is not present in the report
   * even though we see audio and it's not silence.
   * In that case we rely on the number of packetsReceived.
   * If there is genuine silence, then totalAudioEnergy must be present,
   * albeit being a small number.
   */
  console.log(
    `Evaluating audio energy (min energy: ${minTotalAudioEnergy}, min packets: ${minPacketsReceived})`
  )
  const totalAudioEnergy = audioStats['inbound-rtp']['totalAudioEnergy']
  const packetsReceived = audioStats['inbound-rtp']['packetsReceived']
  if (totalAudioEnergy) {
    expect(totalAudioEnergy).toBeGreaterThan(minTotalAudioEnergy)
  } else {
    console.log('Warning: totalAudioEnergy was missing from the report!')
    if (packetsReceived) {
      // We still want the right amount of packets
      expect(packetsReceived).toBeGreaterThan(minPacketsReceived)
    } else {
      console.log('Warning: packetsReceived was missing from the report!')
      /* We don't make this test fail, because the absence of packetsReceived
       * is a symptom of an issue with RTCStats, rather than an indication
       * of lack of RTP flow.
       */
    }
  }
}

export const expectv2HasReceivedSilence = async (
  page: Page,
  maxTotalAudioEnergy: number,
  minPacketsReceived: number
) => {
  const audioStats = await page.evaluate(async () => {
    // @ts-expect-error
    const currentCall = window.__currentCall
    const audioReceiver = currentCall.peer.instance
      .getReceivers()
      .find((r: any) => r.track.kind === 'audio')

    const audioTrackId = audioReceiver.track.id

    const stats = await currentCall.peer.instance.getStats(null)
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
        if (
          report.type == key &&
          report['mediaType'] === 'audio' &&
          report['trackIdentifier'] === audioTrackId
        ) {
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
  console.log('audioStats: ', audioStats)

  /* This is a workaround what we think is a bug in Playwright/Chromium
   * There are cases where totalAudioEnergy is not present in the report
   * even though we see audio and it's not silence.
   * In that case we rely on the number of packetsReceived.
   * If there is genuine silence, then totalAudioEnergy must be present,
   * albeit being a small number.
   */
  console.log(
    `Evaluating audio energy (max energy: ${maxTotalAudioEnergy}, min packets: ${minPacketsReceived})`
  )
  const totalAudioEnergy = audioStats['inbound-rtp']['totalAudioEnergy']
  const packetsReceived = audioStats['inbound-rtp']['packetsReceived']
  if (totalAudioEnergy) {
    expect(totalAudioEnergy).toBeLessThan(maxTotalAudioEnergy)
  } else {
    console.log('Warning: totalAudioEnergy was missing from the report!')
    if (packetsReceived) {
      // We still want the right amount of packets
      expect(packetsReceived).toBeGreaterThan(minPacketsReceived)
    } else {
      console.log('Warning: packetsReceived was missing from the report!')
      /* We don't make this test fail, because the absence of packetsReceived
       * is a symptom of an issue with RTCStats, rather than an indication
       * of lack of RTP flow.
       */
    }
  }
}

export const expectedMinPackets = (
  packetRate: number,
  callDurationMs: number,
  maxMissingPacketsTolerance: number // 0 to 1.0
) => {
  if (maxMissingPacketsTolerance < 0) {
    maxMissingPacketsTolerance = 0
  }
  if (maxMissingPacketsTolerance > 1) {
    maxMissingPacketsTolerance = 1
  }

  const minPackets =
    (callDurationMs * (1 - maxMissingPacketsTolerance) * packetRate) / 1000

  return minPackets
}

export const randomizeResourceName = (prefix: string = 'e2e') => {
  return `res-${prefix}${uuid()}`
}

export const expectInjectRelayHost = async (page: Page, host: string) => {
  await page.evaluate(
    async (params) => {
      // @ts-expect-error
      window.__host = params.host
    },
    {
      host: host,
    }
  )
}

export const expectInjectIceTransportPolicy = async (
  page: Page,
  iceTransportPolicy: string
) => {
  await page.evaluate(
    async (params) => {
      // @ts-expect-error
      window.__iceTransportPolicy = params.iceTransportPolicy
    },
    {
      iceTransportPolicy,
    }
  )
}

export const expectRelayConnected = async (
  page: Page,
  envRelayProject: string,
  jwt: string
) => {
  // Project locator
  const project = page.locator('#project')
  expect(project).not.toBe(null)

  // Token locator
  const token = page.locator('#token')
  expect(token).not.toBe(null)

  // Populate project and token using locators
  await project.fill(envRelayProject)
  await token.fill(jwt)

  // Click the connect button, which calls the connect function in the browser
  await page.click('#btnConnect')

  // Start call button locator
  const startCall = page.locator('#startCall')
  expect(startCall).not.toBe(null)

  // Wait for call button to be enabled when signalwire.ready occurs
  await expect(startCall).toBeEnabled()
}

// #endregion

// #region Utilities for Resources CRUD operations

export interface Resource {
  id: string
  project_id: string
  type: string
  display_name: string
  created_at: string
}

export const createVideoRoomResource = async (name?: string) => {
  const response = await fetch(
    `https://${process.env.API_HOST}/api/fabric/resources/video_rooms`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${BASIC_TOKEN}`,
      },
      body: JSON.stringify({
        name: name ?? `e2e-test-room_${uuid()}`,
      }),
    }
  )
  const data = (await response.json()) as Resource
  console.log('>> Resource VideoRoom created:', data.id, name)
  return data
}

export interface CreateSWMLAppResourceParams {
  name?: string
  contents: Record<any, any>
}
export const createSWMLAppResource = async ({
  name,
  contents,
}: CreateSWMLAppResourceParams) => {
  const response = await fetch(
    `https://${process.env.API_HOST}/api/fabric/resources/swml_applications`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${BASIC_TOKEN}`,
      },
      body: JSON.stringify({
        name: name ?? `e2e-swml-app_${uuid()}`,
        handle_calls_using: 'script',
        call_handler_script: JSON.stringify(contents),
      }),
    }
  )
  const data = (await response.json()) as Resource
  console.log('>> Resource SWML App created:', data.id)
  return data
}

export interface CreateRelayAppResourceParams {
  name?: string
  topic: string
}
export const createRelayAppResource = async ({
  name,
  topic,
}: CreateRelayAppResourceParams) => {
  const response = await fetch(
    `https://${process.env.API_HOST}/api/fabric/resources/relay_applications`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${BASIC_TOKEN}`,
      },
      body: JSON.stringify({
        name: name ?? `e2e-relay-app_${uuid()}`,
        topic,
      }),
    }
  )
  const data = (await response.json()) as Resource
  console.log('>> Resource Relay App created:', data.id)
  return data
}

export const deleteResource = async (id: string) => {
  const response = await fetch(
    `https://${process.env.API_HOST}/api/fabric/resources/${id}`,
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${BASIC_TOKEN}`,
      },
    }
  )
  return response
}

// #endregion

// #region Utilities for Events assertion

export const expectMemberTalkingEvent = (page: Page) => {
  return page.evaluate(async () => {
    return new Promise((resolve) => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj
      roomObj.on('member.talking', resolve)
    })
  })
}

export const expectMediaEvent = (page: Page, event: MediaEventNames) => {
  return page.evaluate(
    ({ event }) => {
      return new Promise<void>((resolve) => {
        // @ts-expect-error
        const roomObj: Video.RoomSession = window._roomObj
        roomObj.on(event, resolve)
      })
    },
    { event }
  )
}

export const expectCFInitialEvents = (
  page: Page,
  extraEvents: Promise<boolean>[] = []
) => {
  const initialEvents = page.evaluate(async () => {
    // @ts-expect-error
    const roomObj: Video.RoomSession = window._roomObj

    const callCreated = new Promise<boolean>((resolve) => {
      // @ts-expect-error
      roomObj.on('call.state', (params: any) => {
        if (params.call_state === 'created') {
          resolve(true)
        }
      })
    })
    const callAnswered = new Promise<boolean>((resolve) => {
      // @ts-expect-error
      roomObj.on('call.state', (params: any) => {
        if (params.call_state === 'answered') {
          resolve(true)
        }
      })
    })
    const callJoined = new Promise<boolean>((resolve) => {
      // @ts-expect-error
      roomObj.on('call.joined', () => resolve(true))
    })

    return Promise.all([callJoined, callCreated, callAnswered])
  })
  return Promise.all([initialEvents, ...extraEvents])
}

export const expectCFFinalEvents = (
  page: Page,
  extraEvents: Promise<unknown>[] = []
) => {
  const finalEvents = page.evaluate(async () => {
    // @ts-expect-error
    const roomObj: Video.RoomSession = window._roomObj

    const callLeft = new Promise((resolve) => {
      roomObj.on('destroy', () => resolve(true))
    })

    return callLeft
  })

  return Promise.all([finalEvents, ...extraEvents])
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

export const expectRoomJoined = (
  page: Page,
  options: { invokeJoin: boolean } = { invokeJoin: true }
) => {
  return page.evaluate(({ invokeJoin }) => {
    return new Promise<any>(async (resolve, reject) => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj

      roomObj.once('room.joined', (room) => {
        console.log('Room joined!')
        resolve(room)
      })

      if (invokeJoin) {
        await roomObj.join().catch(reject)
      }
    })
  }, options)
}

export const expectScreenShareJoined = async (page: Page) => {
  return page.evaluate(() => {
    return new Promise<any>(async (resolve) => {
      // @ts-expect-error
      const roomObj: Video.RoomSession = window._roomObj

      roomObj.on('member.joined', (params: any) => {
        if (params.member.type === 'screen') {
          resolve(true)
        }
      })

      await roomObj.startScreenShare({
        audio: true,
        video: true,
      })
    })
  })
}

// #endregion

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
