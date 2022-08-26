import type { VideoAuthorization } from '@signalwire/core'
import { BaseRoomSessionJoinParams } from './interfaces'
import { getJoinMediaParams } from './roomSession'

describe('getJoinMediaParams', () => {
  const authState: VideoAuthorization = {
    type: 'video',
    project: 'project_id',
    scopes: ['video'],
    scope_id: 'scope_id',
    resource: 'resource',
    join_as: 'member',
    user_name: 'memberName',
    meta: {},
    audio_allowed: 'both',
    video_allowed: 'both',
    room: {
      name: 'jest',
      display_name: 'Jest',
      scopes: [],
      meta: {},
    },
    signature: 'signature',
  }
  const authStateMap = new Map<string, VideoAuthorization>()
  authStateMap.set('member-all', authState)
  authStateMap.set('member-audio-only', {
    ...authState,
    video_allowed: 'none',
  })
  authStateMap.set('member-video-only', {
    ...authState,
    audio_allowed: 'none',
  })
  authStateMap.set('audience-all', {
    ...authState,
    join_as: 'audience',
  })
  authStateMap.set('audience-audio-only', {
    ...authState,
    join_as: 'audience',
    video_allowed: 'none',
  })
  authStateMap.set('audience-video-only', {
    ...authState,
    join_as: 'audience',
    audio_allowed: 'none',
  })

  /**
   * Build all the combinations of arguments that `getJoinMediaParams()`
   * could receive.
   */
  const keys: (keyof BaseRoomSessionJoinParams)[] = [
    'sendAudio',
    'receiveAudio',
    'sendVideo',
    'receiveVideo',
    'audio',
    'video',
  ]
  const cases: BaseRoomSessionJoinParams[] = []
  const booleans = [true, false]
  keys.forEach((key, index) => {
    booleans.forEach((bool) => {
      const tmp: BaseRoomSessionJoinParams = {}
      for (let i = index; i < keys.length; i++) {
        tmp[keys[i]] = bool
      }

      tmp[key] = bool
      cases.push(tmp)

      if (Object.keys(tmp).length > 1) {
        cases.push({ ...tmp, [key]: !bool })
        cases.push({ [key]: bool })
      }
    })
  })

  /**
   * Build describe/test blocks dynamically for
   * JoinAs types: member / audience
   * Media Allowed: 'all', 'audio-only', 'video-only'
   *
   * For each pair, do a test with all the possible
   * combinations built above to make sure the correct
   * values are returned by `getJoinMediaParams()`
   *
   * The logic used in here is different from the implementation
   * of `getJoinMediaParams` to prove the correct values.
   */
  const joinAs = ['member', 'audience']
  const mediaDirectionAllowed = ['all', 'audio-only', 'video-only']
  joinAs.forEach((joinType) => {
    describe(`as ${joinType}`, () => {
      mediaDirectionAllowed.forEach((direction) => {
        describe(`with media_allowed: '${direction}'`, () => {
          cases.forEach((params) => {
            const {
              audio = true, // true if undefined
              video = true, // true if undefined
              sendAudio,
              receiveAudio,
              sendVideo,
              receiveVideo,
            } = params

            // prettier-ignore
            const reqToSendAudio = typeof sendAudio !== 'undefined' ? sendAudio : Boolean(audio)
            // prettier-ignore
            const reqToSendVideo = typeof sendVideo !== 'undefined' ? sendVideo : Boolean(video)
            // prettier-ignore
            const reqToRecvAudio = typeof receiveAudio !== 'undefined' ? receiveAudio : Boolean(audio)
            // prettier-ignore
            const reqToRecvVideo = typeof receiveVideo !== 'undefined' ? receiveVideo : Boolean(video)

            it(`should handle params: ${JSON.stringify(params)}`, () => {
              const authState = authStateMap.get(`${joinType}-${direction}`)
              if (!authState) {
                throw 'Invalid AuthState'
              }
              const result = getJoinMediaParams({ ...params, authState })

              expect(result).toStrictEqual({
                // prettier-ignore
                mustSendAudio: joinType === 'member' && direction !== 'video-only' && reqToSendAudio,
                // prettier-ignore
                mustSendVideo: joinType === 'member' && direction !== 'audio-only' && reqToSendVideo,
                mustRecvAudio: direction !== 'video-only' && reqToRecvAudio,
                mustRecvVideo: direction !== 'audio-only' && reqToRecvVideo,
              })
            })
          })
        })
      })
    })
  })
})
