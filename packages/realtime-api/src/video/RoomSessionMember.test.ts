import { configureJestStore } from '../testUtils'
import {
  createRoomSessionMemberObject,
  RoomSessionMember,
} from './RoomSessionMember'

describe('Member Object', () => {
  let member: RoomSessionMember

  beforeEach(() => {
    member = createRoomSessionMemberObject({
      store: configureJestStore(),
      emitter: jest.fn() as any,
    })
    // @ts-expect-error
    member.execute = jest.fn()
  })

  const expectExecute = (payload: any) => {
    // @ts-expect-error
    expect(member.execute).toHaveBeenLastCalledWith(payload, {
      transformResolve: expect.anything(),
    })
    // @ts-expect-error
    member.execute.mockClear()
  }

  it('should have all the custom methods defined', async () => {
    await member.audioMute()
    expectExecute({
      method: 'video.member.audio_mute',
      params: {
        room_session_id: member.roomSessionId,
        member_id: member.id,
      },
    })
    await member.audioUnmute()
    expectExecute({
      method: 'video.member.audio_unmute',
      params: {
        room_session_id: member.roomSessionId,
        member_id: member.id,
      },
    })
    await member.videoMute()
    expectExecute({
      method: 'video.member.video_mute',
      params: {
        room_session_id: member.roomSessionId,
        member_id: member.id,
      },
    })
    await member.videoUnmute()
    expectExecute({
      method: 'video.member.video_unmute',
      params: {
        room_session_id: member.roomSessionId,
        member_id: member.id,
      },
    })
    await member.setDeaf()
    expectExecute({
      method: 'video.member.deaf',
      params: {
        room_session_id: member.roomSessionId,
        member_id: member.id,
      },
    })
    // await member.setDeaf(false)
    // expectExecute({
    //   method: 'video.member.undeaf',
    //   params: {
    //     room_session_id: member.roomSessionId,
    //     member_id: member.id,
    //   },
    // })
    // expect(member.setUndeaf).toBeDefined()
    await member.setMicrophoneVolume({ volume: 10 })
    expectExecute({
      method: 'video.member.set_input_volume',
      params: {
        room_session_id: member.roomSessionId,
        member_id: member.id,
        volume: 10,
      },
    })
    await member.setSpeakerVolume({ volume: 10 })
    expectExecute({
      method: 'video.member.set_output_volume',
      params: {
        room_session_id: member.roomSessionId,
        member_id: member.id,
        volume: 10,
      },
    })
    await member.setInputSensitivity({ value: 10 })
    expectExecute({
      method: 'video.member.set_input_sensitivity',
      params: {
        room_session_id: member.roomSessionId,
        member_id: member.id,
        value: 10,
      },
    })

    await member.remove()
    // @ts-expect-error
    expect(member.execute).toHaveBeenLastCalledWith({
      method: 'video.member.remove',
      params: {
        room_session_id: member.roomSessionId,
        member_id: member.id,
      },
    })
  })
})
