import { Chat } from '@signalwire/realtime-api'

async function run() {
  try {
    const chat = new Chat.Client({
      // @ts-expect-error
      host: process.env.HOST || 'relay.swire.io',
      project: process.env.PROJECT as string,
      token: process.env.TOKEN as string,
    })

    const channel = 'channel-name-here'

    chat.on('member.joined', (member) => {
      console.log('member.joined', member)
    })

    chat.on('member.updated', (member) => {
      console.log('member.updated', member)
    })

    chat.on('member.left', (member) => {
      console.log('member.left', member)
    })

    chat.on('message', (message) => {
      console.log('message', message)
    })

    await chat.subscribe([channel])

    const pubRes = await chat.publish({
      content: 'Hello There',
      channel: channel,
      meta: {
        fooId: 'randomValue',
      },
    })

    console.log('Publish Result --->', pubRes)

    const messagesResult = await chat.getMessages({
      channel: channel,
    })

    console.log('Get Messages Result ---> ', messagesResult)

    const setStateResult = await chat.setMemberState({
      state: {
        data: 'state data',
      },
      channels: [channel],
      memberId: 'someMemberId',
    })

    console.log('Set Member State Result --->', setStateResult)

    const getStateResult = await chat.getMemberState({
      channels: [channel],
      memberId: 'someMemberId',
    })

    console.log('Get Member State Result --->', getStateResult)

    const unsubscribeRes = await chat.unsubscribe(channel)

    console.log('Unsubscribe Result --->', unsubscribeRes)

    console.log('Client Running..')
  } catch (error) {
    console.log('<Error>', error)
  }
}

run()
