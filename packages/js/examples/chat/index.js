import { Chat } from '@signalwire/js'

window.connect = () => {
  const chat = new Chat({
    host: 'ws://localhost:8080',
  })

  chat.on('message', (args) => {
    console.log('---> Example message!', args)
  })

  chat.subscribe(['one, two'])
}
