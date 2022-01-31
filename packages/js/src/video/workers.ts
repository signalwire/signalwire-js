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
    const pubSubAction = yield sagaEffects.take(pubSubChannel)
    const { type, payload } = pubSubAction

    if (
      type === 'video.room.joined' ||
      type === 'video.member.joined' ||
      type === 'video.member.left' ||
      type.startsWith('video.member.updated')
    ) {
      yield sagaEffects.put(pubSubChannel, {
        type: toSyntheticEvent('video.members.changed') as any,
        payload: payload,
      })
    }
  }
}
