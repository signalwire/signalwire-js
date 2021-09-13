import { BaseRoomInterface } from '.'
import { VideoMember, VideoRecording } from '../types'
import { ExecuteExtendedOptions, RoomMethod } from '../utils/interfaces'

interface RoomMethodPropertyDescriptor<T> extends PropertyDescriptor {
  value: (params: RoomMethodParams) => Promise<T>
}
type RoomMethodDescriptor<T = unknown> = RoomMethodPropertyDescriptor<T> &
  // TODO: Replace string with a tighter type
  ThisType<BaseRoomInterface<string>>
type RoomMethodParams = Record<string, unknown>
interface BaseRPCResult {
  code: string
  message: string
  [k: string]: unknown
}

/**
 * Transform for returning `undefined` for `execute`s that were
 * successully resolved. If the `execute` failed for some reason, then
 * the promise will be rejected and this transform will never be
 * executed.
 */
const baseCodeTransform = () => {}

const createRoomMethod = <InputType, OutputType = InputType>(
  method: RoomMethod,
  options: ExecuteExtendedOptions<InputType, OutputType> = {}
): RoomMethodDescriptor<OutputType> => ({
  value: function (params: RoomMethodParams = {}): Promise<OutputType> {
    return this.execute(
      {
        method,
        params: {
          room_session_id: this.roomSessionId,
          ...params,
        },
      },
      options
    )
  },
})

/**
 * Type the params for each room member method that uses the provided
 * memberId or fallback to the instance memberId. Additional params
 * can be passed as `value` or `volume`.
 */
interface RoomMemberMethodParams {
  memberId?: string
  [key: string]: unknown
}

const createRoomMemberMethod = <InputType, OutputType>(
  method: RoomMethod,
  options: ExecuteExtendedOptions<InputType, OutputType> = {}
): RoomMethodDescriptor<OutputType> => ({
  value: function ({ memberId, ...rest }: RoomMemberMethodParams = {}) {
    return this.execute(
      {
        method,
        params: {
          room_session_id: this.roomSessionId,
          member_id: memberId || this.memberId,
          ...rest,
        },
      },
      options
    )
  },
})

/**
 * Room Methods
 */
export const getLayouts = createRoomMethod<{ layouts: string[] }>(
  'video.list_available_layouts',
  {
    transformResolve: (payload) => ({ layouts: payload.layouts }),
  }
)
export const getMembers = createRoomMethod<{ members: VideoMember[] }>(
  'video.members.get',
  {
    transformResolve: (payload) => ({ members: payload.members }),
  }
)
export const setLayout = createRoomMethod<BaseRPCResult, void>(
  'video.set_layout',
  {
    transformResolve: baseCodeTransform,
  }
)
export const hideVideoMuted = createRoomMethod<BaseRPCResult, void>(
  'video.hide_video_muted',
  {
    transformResolve: baseCodeTransform,
  }
)
export const showVideoMuted = createRoomMethod<BaseRPCResult, void>(
  'video.show_video_muted',
  {
    transformResolve: baseCodeTransform,
  }
)
export const getRecordings = createRoomMethod<{ recordings: VideoRecording[] }>(
  'video.recording.list',
  {
    transformResolve: (payload) => ({ recordings: payload.recordings }),
  }
)
export const startRecording: RoomMethodDescriptor<any> = {
  value: function () {
    return new Promise(async (resolve) => {
      const handler = (instance: any) => {
        resolve(instance)
      }
      this.on('video.__internal__.recording.start', handler)

      try {
        const payload = await this.execute({
          method: 'video.recording.start',
          params: {
            room_session_id: this.roomSessionId,
          },
        })
        this.emit('video.__internal__.recording.start', payload)
      } catch (error) {
        this.off('video.__internal__.recording.start', handler)
        throw error
      }
    })
  },
}

export type GetLayouts = ReturnType<typeof getLayouts.value>
export type GetMembers = ReturnType<typeof getMembers.value>
export type HideVideoMuted = ReturnType<typeof hideVideoMuted.value>
export type ShowVideoMuted = ReturnType<typeof showVideoMuted.value>

export type GetRecordings = ReturnType<typeof getRecordings.value>
export type StartRecording = ReturnType<typeof startRecording.value>
// End Room Methods

/**
 * Room Member Methods
 */
export const audioMuteMember = createRoomMemberMethod<BaseRPCResult, void>(
  'video.member.audio_mute',
  {
    transformResolve: baseCodeTransform,
  }
)
export const audioUnmuteMember = createRoomMemberMethod<BaseRPCResult, void>(
  'video.member.audio_unmute',
  {
    transformResolve: baseCodeTransform,
  }
)
export const videoMuteMember = createRoomMemberMethod<BaseRPCResult, void>(
  'video.member.video_mute',
  {
    transformResolve: baseCodeTransform,
  }
)
export const videoUnmuteMember = createRoomMemberMethod<BaseRPCResult, void>(
  'video.member.video_unmute',
  {
    transformResolve: baseCodeTransform,
  }
)
export const deafMember = createRoomMemberMethod<BaseRPCResult, void>(
  'video.member.deaf',
  {
    transformResolve: baseCodeTransform,
  }
)
export const undeafMember = createRoomMemberMethod<BaseRPCResult, void>(
  'video.member.undeaf',
  {
    transformResolve: baseCodeTransform,
  }
)
export const setInputVolumeMember = createRoomMemberMethod<BaseRPCResult, void>(
  'video.member.set_input_volume',
  {
    transformResolve: baseCodeTransform,
  }
)
export const setOutputVolumeMember = createRoomMemberMethod<
  BaseRPCResult,
  void
>('video.member.set_output_volume', {
  transformResolve: baseCodeTransform,
})
export const setInputSensitivityMember = createRoomMemberMethod<
  BaseRPCResult,
  void
>('video.member.set_input_sensitivity', {
  transformResolve: baseCodeTransform,
})
export const removeMember: RoomMethodDescriptor<void> = {
  value: function ({ memberId, ...rest }: RoomMemberMethodParams = {}) {
    if (!memberId) {
      throw new TypeError('Invalid or missing "memberId" argument')
    }
    return this.execute(
      {
        method: 'video.member.remove',
        params: {
          room_session_id: this.roomSessionId,
          member_id: memberId,
          ...rest,
        },
      },
      {
        transformResolve: baseCodeTransform,
      }
    )
  },
}

export type AudioMuteMember = ReturnType<typeof audioMuteMember.value>
export type AudioUnmuteMember = ReturnType<typeof audioUnmuteMember.value>
export type VideoMuteMember = ReturnType<typeof videoMuteMember.value>
export type VideoUnmuteMember = ReturnType<typeof videoUnmuteMember.value>
export type DeafMember = ReturnType<typeof deafMember.value>
export type UndeafMember = ReturnType<typeof undeafMember.value>
export type SetLayout = ReturnType<typeof setLayout.value>
export type SetInputVolumeMember = ReturnType<typeof setInputVolumeMember.value>
export type SetOutputVolumeMember = ReturnType<
  typeof setOutputVolumeMember.value
>
export type SetInputSensitivityMember = ReturnType<
  typeof setInputSensitivityMember.value
>
export type RemoveMember = ReturnType<typeof removeMember.value>
// End Room Member Methods
