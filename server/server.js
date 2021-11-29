// import * as WS from 'ws'
const WebSocket = require('ws')
const wss = new WebSocket.Server({ port: 8080 })

wss.on('connection', function connection(ws) {
  console.log('on connection')
  ws.on('ping', () => {
    ws.send('pong')
  })

  ws.on('message', function message(data) {
    console.log('received: %s', data)
    const parsedData = JSON.parse(data)
    if (parsedData.method === 'signalwire.connect') {
      console.log('Authorized!')
      ws.send(
        JSON.stringify({
          jsonrpc: '2.0',
          id: parsedData.id,
          ...{
            result: {
              identity:
                '041fcfba-00cb-49f2-945b-4b9b15bbf8be@3c699ae7-acaa-417a-9b1a-c406794cce21.west-us',
              authorization: {
                type: 'video',
                space_id: 'f6e0ee46-4bd4-4856-99bb-0f3bc3d3e787',
                project_id: '78429ef1-283b-4fa9-8ebc-16b59f95bb1f',
                project: '78429ef1-283b-4fa9-8ebc-16b59f95bb1f',
                scopes: ['video'],
                scope_id: 'ceaf9772-be9e-47b5-92ff-9fd45db5c2f4',
                resource: '3ba8857f-adf0-4607-be84-057e8dea9def',
                user_name: 'fran',
                join_until: 1652446436,
                join_from: null,
                remove_at: null,
                remove_after_seconds_elapsed: null,
                auto_create_room: true,
                room: {
                  name: 'ios',
                  display_name: 'ios',
                  scopes: [
                    'room.self.audio_mute',
                    'room.self.audio_unmute',
                    'room.self.video_mute',
                    'room.self.video_unmute',
                    'room.self.deaf',
                    'room.self.undeaf',
                    'room.self.set_input_volume',
                    'room.self.set_output_volume',
                    'room.self.set_input_sensitivity',
                    'room.member.audio_mute',
                    'room.member.video_mute',
                    'room.member.video_mute',
                    'room.member.video_unmute',
                    'room.member.deaf',
                    'room.member.undeaf',
                    'room.member.set_input_volume',
                    'room.member.set_output_volume',
                    'room.member.set_input_sensitivity',
                    'room.member.remove',
                    'room.set_layout',
                    'room.list_available_layouts',
                    'room.recording',
                    'room.playback',
                    'room.hide_video_muted',
                    'room.show_video_muted',
                  ],
                  join_audio_muted: true,
                  join_video_muted: true,
                },
                signature:
                  'd97f0743ea94595d413cf7fb71f2fef98b78db9fb1d7bf18f80ed51581b1260a',
              },
              protocol:
                'signalwire_d97f0743ea94595d413cf7fb71f2fef98b78db9fb1d7bf18f80ed51581b1260a_7b5501e6-230e-4340-8424-d84b7c3a39e3_78429ef1-283b-4fa9-8ebc-16b59f95bb1f',
              ice_servers: [
                {
                  urls: ['turn:turn.swire.io:443'],
                  credential: 'Q7eoFagbJtMW8LDeaYS9XzgDSPs=',
                  credentialType: 'password',
                  username: '1637676908:78429ef1-283b-4fa9-8ebc-16b59f95bb1f',
                },
              ],
            },
          },
        }),
        function () {
          console.log('--> sent!')
        }
      )
    } else if (parsedData.method === 'chat.subscribe') {
      console.log('chat.subscribe')
      ws.send(
        JSON.stringify({
          jsonrpc: '2.0',
          id: parsedData.id,
          result: {},
        })
      )

      setTimeout(() => {
        ws.send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: '2d2f4457-e9d8-49b2-a93f-42ef3afbf8c4',
            method: 'signalwire.event',
            params: {
              params: {
                channels: [
                  { name: 'watercooler' },
                  { name: 'foo' },
                  { name: 'bar' },
                ],
              },
              event_type: 'chat.subscribed',
              timestamp: 1638179628.8468,
            },
          })
        )
      }, 100)

      setTimeout(() => {
        console.log('Send chat.message')
        ws.send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: '007b26c0-11dd-415c-adaf-03488e45fdef',
            method: 'signalwire.event',
            params: {
              event_type: 'chat.channel.message',
              event_channel: 'chat.78429ef1-283b-4fa9-8ebc-16b59f95bb1f',
              params: {
                channel: 'watercooler',
                message: 'Hello World!',
                sender: {
                  id: '1c71bcf5-7524-4833-8e0d-3d89f06d41b8',
                  name: 'joesmith',
                },
                meta: {
                  // custom data sent by the sender
                },
              },
              timestamp: 1631201227.2882,
            },
          })
        )
      }, 3000)
    }
  })
})
