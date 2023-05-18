import { Page, Browser } from '@playwright/test'
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

type CreateRoomSessionParams = CreateVRTParams & { browser: Browser }
export const createNewTabRoomSession = async (
  params: CreateRoomSessionParams
): Promise<void> => {
  try {
    const { browser, ...auth } = params

    const tab = await browser.newPage()
    await tab.goto(SERVER_URL)
    enablePageLogs(tab)

    const vrt = await createTestVRTToken(auth)

    return tab.evaluate(
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

          let waitForRecordStartResolve: (value: void) => void
          const waitForRecordStart = new Promise((resolve) => {
            waitForRecordStartResolve = resolve
          })
          let waitForPlaybackStartResolve: (value: void) => void
          const waitForPlaybackStart = new Promise((resolve) => {
            waitForPlaybackStartResolve = resolve
          })

          roomSession.on('recording.started', () => {
            waitForRecordStartResolve()
          })

          roomSession.on('playback.started', () => {
            waitForPlaybackStartResolve()
          })

          roomSession.on('room.joined', async () => {
            await roomSession.startRecording()
            await waitForRecordStart

            await roomSession.play({ url: options.PLAYBACK_URL })
            await waitForPlaybackStart

            resolve()
          })

          await roomSession.join()
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
