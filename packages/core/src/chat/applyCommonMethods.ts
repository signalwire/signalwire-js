import {
  InternalChatMemberEntity,
  InternalChatMessageEntity,
  PaginationCursor,
} from '../types'
import { toExternalJSON } from '../utils'
import { BaseRPCResult } from '../utils/interfaces'
import { isValidChannels, toInternalChatChannels } from './utils'

export interface GetMembersInput extends BaseRPCResult {
  members: InternalChatMemberEntity[]
}

export interface GetMessagesInput extends BaseRPCResult {
  messages: InternalChatMessageEntity[]
  cursor: PaginationCursor
}

interface ChatMemberMethodParams extends Record<string, unknown> {
  memberId?: string
}

interface GetMemberStateOutput {
  channels: any
}

const transformParamChannels = (params: ChatMemberMethodParams) => {
  const channels = isValidChannels(params?.channels)
    ? toInternalChatChannels(params.channels)
    : undefined

  return {
    ...params,
    channels,
  }
}

const baseCodeTransform = () => {}

export function applyCommonMethods<T extends new (...args: any[]) => any>(
  targetClass: T
) {
  return class extends targetClass {
    getMembers(params: GetMembersInput) {
      return this._client.execute(
        {
          method: 'chat.members.get',
          params,
        },
        {
          transformResolve: (payload: GetMembersInput) => ({
            members: payload.members.map((member) => toExternalJSON(member)),
          }),
        }
      )
    }

    getMessages(params: GetMessagesInput) {
      return this._client.execute(
        {
          method: 'chat.messages.get',
          params,
        },
        {
          transformResolve: (payload: GetMessagesInput) => ({
            messages: payload.messages.map((message) =>
              toExternalJSON(message)
            ),
            cursor: payload.cursor,
          }),
        }
      )
    }

    setMemberState({ memberId, ...rest }: Record<string, unknown> = {}) {
      return this._client.execute(
        {
          method: 'chat.member.set_state',
          params: {
            member_id: memberId,
            ...rest,
          },
        },
        {
          transformResolve: baseCodeTransform,
          transformParams: transformParamChannels,
        }
      )
    }

    getMemberState({ memberId, ...rest }: Record<string, unknown> = {}) {
      return this._client.execute(
        {
          method: 'chat.member.get_state',
          params: {
            member_id: memberId,
            ...rest,
          },
        },
        {
          transformResolve: (payload: GetMemberStateOutput) => ({
            channels: payload.channels,
          }),
          transformParams: transformParamChannels,
        }
      )
    }
  }
}
