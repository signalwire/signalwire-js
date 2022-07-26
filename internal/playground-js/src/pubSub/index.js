import { Chat as PubSub } from '@signalwire/js'

window.connect = async ({ channels, host, token }) => {
  const pubSubClient = new PubSub.Client({
    host,
    token,
  })

  // .subscribe should be after .on but i left here for test.
  await pubSubClient.subscribe(channels)

  pubSubClient.on('message', (message) => {
    console.log(
      'Received',
      message.content,
      'on',
      message.channel,
      'at',
      message.publishedAt
    )
  })

  await pubSubClient.publish({
    channel: channels[0],
    content: 'Hello World',
  })
}
