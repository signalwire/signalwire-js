import {
  sagaEffects,
  SagaIterator,
  SDKWorker,
  toSyntheticEvent,
} from '@signalwire/core'

export const membersChangedWorker: SDKWorker = function* membersChangedWorker({
  channels: { pubSubChannel },
}): SagaIterator {
  while (true) {
    const pubSubAction = yield sagaEffects.take(pubSubChannel, ({ type }: any) => {
      return (
        type === 'video.room.joined' ||
        type === 'video.member.joined' ||
        type === 'video.member.left' ||
        type.startsWith('video.member.updated')
      )
    })

    const { payload } = pubSubAction
    yield sagaEffects.put(pubSubChannel, {
      type: toSyntheticEvent('video.members.changed') as any,
      payload: payload,
    })
  }
}
