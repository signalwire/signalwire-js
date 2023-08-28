import { SignalWire } from '@signalwire/realtime-api'

async function run() {
  try {
    const client = await SignalWire({
      host: process.env.HOST || 'relay.swire.io',
      project: process.env.PROJECT as string,
      token: process.env.TOKEN as string,
    })

    const unsubHome = await client.chat.listen({
      channels: ['home'],
      onMessageReceived: (message) => {
        console.log('Message received on "home" channel', message)
      },
      onMemberJoined: (member) => {
        console.log('Member joined on "home" channel', member)
      },
      onMemberUpdated: (member) => {
        console.log('Member updated on "home" channel', member)
      },
      onMemberLeft: (member) => {
        console.log('Member left on "home" channel', member)
      },
    })

    const pubRes = await client.chat.publish({
      content: 'Hello There',
      channel: 'home',
      meta: {
        fooId: 'randomValue',
      },
    })
    console.log('Publish Result --->', pubRes)

    const messagesResult = await client.chat.getMessages({
      channel: 'home',
    })
    console.log('Get Messages Result ---> ', messagesResult)

    const getMembersResult = await client.chat.getMembers({ channel: 'home' })
    console.log('Get Member Result --->', getMembersResult)

    const setStateResult = await client.chat.setMemberState({
      state: {
        data: 'state data',
      },
      channels: ['home'],
      memberId: getMembersResult.members[0].id,
    })
    console.log('Set Member State Result --->', setStateResult)

    const getStateResult = await client.chat.getMemberState({
      channels: 'home',
      memberId: getMembersResult.members[0].id,
    })
    console.log('Get Member State Result --->', getStateResult)

    console.log('Unsubscribing --->')
    await unsubHome()

    console.log('Client disconnecting..')
    client.disconnect()
  } catch (error) {
    console.log('<Error>', error)
  }
}

run()
