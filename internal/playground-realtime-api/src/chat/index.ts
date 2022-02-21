import { Chat } from '@signalwire/realtime-api'

async function run() {
  console.log('PROJECT --->', process.env.PROJECT)
  console.log('TOKEN --->', process.env.TOKEN)
  try {
    const chat = new Chat.Client({
      // @ts-expect-error
      host: process.env.HOST || 'relay.swire.io',
      project: process.env.PROJECT as string,
      token: process.env.TOKEN as string,
    })

    chat.on('member.joined', (member) => {
      console.log('member --->', member)
    })

    await chat.subscribe(['lobby'])

    const pubRes = await chat.publish({
      content: 'Hello There',
      channel: 'lobby',
      meta: {
        data: 'whatever',
      },
    })

    console.log('Publish Result --->', pubRes)

    const messagesResult = await chat.getMessages({
      channel: 'lobby',
    })

    console.log('Get Messages Result ---> ', messagesResult)

    const setStateResult = await chat.setMemberState({
      state: {
        data: 'state data',
      },
      channels: ['lobby'],
      memberId: 'test-user',
    })

    console.log('Set Member State Result --->', setStateResult)

    const getStateResult = await chat.getMemberState({
      channels: ['lobby'],
      memberId: 'test-user',
    })

    console.log('Get Member State Result --->', getStateResult)

    const unsubscribeRes = await chat.unsubscribe(['lobby'])

    console.log('Unsubscribe Result --->', unsubscribeRes)

    console.log('Client Running..')
  } catch (error) {
    console.log('<Error>', error)
  }
}

run()
