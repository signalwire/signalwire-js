import { actions } from '@signalwire/core'
import { configureFullStack } from '../../testUtils'
import { RoomSession, RoomSessionAPI } from '../RoomSession'
import { RoomSessionMember } from './RoomSessionMember'
import { Video } from '../Video'
import { createClient } from '../../client/createClient'

describe('Member Object', () => {
  let video: Video
  let roomSession: RoomSession
  let member: RoomSessionMember
  const roomSessionId = '3b36a747-e33a-409d-bbb9-1ddffc543b6d'
  const memberId = '483c60ba-b776-4051-834a-5575c4b7cffe'
  const { store, destroy } = configureFullStack()

  const userOptions = {
    host: 'example.com',
    project: 'example.project',
    token: 'example.token',
    store,
  }

  beforeEach(() => {
    const swClientMock = {
      userOptions,
      client: createClient(userOptions),
    }
    // @ts-expect-error
    video = new Video(swClientMock)
    // @ts-expect-error
    video._client.execute = jest.fn()
    // @ts-expect-error
    video._client.runWorker = jest.fn()

    return new Promise(async (resolve) => {
      roomSession = new RoomSessionAPI({
        video,
        payload: {
          room_session: {
            id: roomSessionId,
            event_channel: 'room.e4b8baff-865d-424b-a210-4a182a3b1451',
          },
        },
      })
      // @ts-expect-error
      roomSession._client.store.instanceMap.set(roomSessionId, roomSession)
      // @ts-expect-error
      roomSession._client.execute = jest.fn()

      await roomSession.listen({
        onMemberJoined: (newMember) => {
          member = newMember
          resolve(member)
        },
      })

      const memberJoinedEvent = JSON.parse(
        `{"jsonrpc":"2.0","id":"uuid","method":"signalwire.event","params":{"params":{"room_session_id":"${roomSessionId}","room_id":"03b71e19-1ed2-4417-a544-7d0ca01186ed","member":{"visible":false,"room_session_id":"${roomSessionId}","input_volume":0,"id":"${memberId}","input_sensitivity":44,"audio_muted":false,"output_volume":0,"name":"edoardo","deaf":false,"video_muted":false,"room_id":"03b71e19-1ed2-4417-a544-7d0ca01186ed","type":"member"}},"timestamp":1234,"event_type":"video.member.joined","event_channel":"${roomSession.eventChannel}"}}`
      )
      // @ts-expect-error
      video._client.store.channels.sessionChannel.put(
        actions.socketMessageAction(memberJoinedEvent)
      )

      // Emit room.subscribed event to resolve the promise above.
      const roomSubscribedEvent = JSON.parse(
        `{"jsonrpc":"2.0","id":"4198ee12-ec98-4002-afc5-e031fc32bb8a","method":"signalwire.event","params":{"params":{"room_session":{"recording":false,"name":"behindTheWire","hide_video_muted":false,"id":"${roomSessionId}","members":[{"visible":false,"room_session_id":"${roomSessionId}","input_volume":0,"id":"b3b0cfd6-2382-4ac6-a8c9-9182584697ae","input_sensitivity":44,"audio_muted":false,"output_volume":0,"name":"edoardo","deaf":false,"video_muted":false,"room_id":"297ec3bb-fdc5-4995-ae75-c40a43c272ee","type":"member"}],"room_id":"297ec3bb-fdc5-4995-ae75-c40a43c272ee","event_channel":"${roomSession.eventChannel}"}},"timestamp":1632738590.6955,"event_type":"video.room.subscribed","event_channel":"${roomSession.eventChannel}"}}`
      )
      // @ts-expect-error
      video._client.store.channels.sessionChannel.put(
        actions.socketMessageAction(roomSubscribedEvent)
      )
    })
  })

  afterAll(() => {
    destroy()
  })

  const expectExecute = (payload: any) => {
    // @ts-expect-error
    expect(member._client.execute).toHaveBeenLastCalledWith(payload, {
      transformResolve: expect.anything(),
    })
    // @ts-expect-error
    member._client.execute.mockClear()
  }

  it('should have all the custom methods defined', async () => {
    await member.audioMute()
    expectExecute({
      method: 'video.member.audio_mute',
      params: {
        room_session_id: roomSessionId,
        member_id: memberId,
      },
    })
    await member.audioUnmute()
    expectExecute({
      method: 'video.member.audio_unmute',
      params: {
        room_session_id: roomSessionId,
        member_id: memberId,
      },
    })
    await member.videoMute()
    expectExecute({
      method: 'video.member.video_mute',
      params: {
        room_session_id: roomSessionId,
        member_id: memberId,
      },
    })
    await member.videoUnmute()
    expectExecute({
      method: 'video.member.video_unmute',
      params: {
        room_session_id: roomSessionId,
        member_id: memberId,
      },
    })
    await member.setDeaf(true)
    expectExecute({
      method: 'video.member.deaf',
      params: {
        room_session_id: roomSessionId,
        member_id: memberId,
      },
    })
    await member.setDeaf(false)
    expectExecute({
      method: 'video.member.undeaf',
      params: {
        room_session_id: roomSessionId,
        member_id: memberId,
      },
    })
    await member.setInputVolume({ volume: 10 })
    expectExecute({
      method: 'video.member.set_input_volume',
      params: {
        room_session_id: roomSessionId,
        member_id: memberId,
        volume: 10,
      },
    })
    await member.setOutputVolume({ volume: 10 })
    expectExecute({
      method: 'video.member.set_output_volume',
      params: {
        room_session_id: roomSessionId,
        member_id: memberId,
        volume: 10,
      },
    })
    await member.setInputSensitivity({ value: 10 })
    expectExecute({
      method: 'video.member.set_input_sensitivity',
      params: {
        room_session_id: roomSessionId,
        member_id: memberId,
        value: 10,
      },
    })

    await member.remove()
    // @ts-expect-error
    expect(member._client.execute).toHaveBeenLastCalledWith({
      method: 'video.member.remove',
      params: {
        room_session_id: member.roomSessionId,
        member_id: member.id,
      },
    })
  })
})
