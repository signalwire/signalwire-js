#!/usr/bin/env node

// First check if @signalwire/realtime-api is installed
let SignalWire;
try {
  const realtimeApi = require('@signalwire/realtime-api');
  SignalWire = realtimeApi.SignalWire;
  console.log('Successfully loaded @signalwire/realtime-api');
} catch (e) {
  console.error('Error loading @signalwire/realtime-api:', e.message);
  console.error('Please run: npm install @signalwire/realtime-api');
  process.exit(1);
}

// Parse command-line arguments
const args = process.argv.slice(2);
const command = args[0];
const params = JSON.parse(args[1] || '{}');

console.log('RelayApp Worker started with command:', command);
console.log('Params:', params);

// Helper function to send messages to parent process
function sendMessage(msg) {
  if (process.send) {
    process.send(msg);
  } else {
    console.log('IPC Message:', JSON.stringify(msg));
  }
}

async function runRelayApp() {
  try {
    const client = await SignalWire({
      host: params.host || process.env.RELAY_HOST,
      project: params.project || process.env.RELAY_PROJECT,
      token: params.token || process.env.RELAY_TOKEN,
      debug: params.debug || { logWsTraffic: true },
    });

    console.log('SignalWire client created');

    const topic = params.topic;

    switch (command) {
      case 'playAudio': {
        await client.voice.listen({
          topics: [topic],
          onCallReceived: async (call) => {
            try {
              console.log('Call received', call.id);
              await call.answer();
              console.log('Inbound call answered');

              const playback = await call
                .playAudio({
                  url: 'https://cdn.signalwire.com/default-music/welcome.mp3',
                })
                .onStarted();
              await playback.setVolume(10);

              console.log('Playback has started!');
              
              // Send playback object ID for control
              sendMessage({ type: 'playbackStarted', playbackId: playback.id });

              // Listen for control messages
              process.on('message', async (msg) => {
                if (msg.type === 'stopPlayback' && msg.playbackId === playback.id) {
                  await playback.stop();
                  sendMessage({ type: 'playbackStopped' });
                }
              });
            } catch (error) {
              console.error('Inbound call error', error);
              sendMessage({ type: 'error', error: error.message });
            }
          },
        });
        console.log('Voice listener started for playAudio');
        break;
      }

      case 'playSilence': {
        await client.voice.listen({
          topics: [topic],
          onCallReceived: async (call) => {
            try {
              console.log('Call received', call.id);
              await call.answer();
              console.log('Inbound call answered');

              const playback = await call.playSilence({ duration: 60 }).onStarted();
              await playback.setVolume(10);

              console.log('Playback silence has started!');
              
              // Send playback object ID for control
              sendMessage({ type: 'playbackStarted', playbackId: playback.id });

              // Listen for control messages
              process.on('message', async (msg) => {
                if (msg.type === 'stopPlayback' && msg.playbackId === playback.id) {
                  await playback.stop();
                  sendMessage({ type: 'playbackStopped' });
                }
              });
            } catch (error) {
              console.error('Inbound call error', error);
              sendMessage({ type: 'error', error: error.message });
            }
          },
        });
        console.log('Voice listener started for playSilence');
        break;
      }

      case 'hangup': {
        await client.voice.listen({
          topics: [topic],
          onCallReceived: async (call) => {
            try {
              console.log('Call received', call.id);
              await call.answer();
              console.log('Inbound call answered');

              await call.hangup();
              console.log('Callee hung up the call!');
              
              sendMessage({ type: 'hungUp' });
            } catch (error) {
              console.error('Inbound call error', error);
              sendMessage({ type: 'error', error: error.message });
            }
          },
        });
        console.log('Voice listener started for hangup');
        break;
      }

      case 'disconnect': {
        await client.disconnect();
        sendMessage({ type: 'disconnected' });
        process.exit(0);
        break;
      }

      default:
        console.error('Unknown command:', command);
        process.exit(1);
    }

    // Keep the process alive
    process.on('message', async (msg) => {
      console.log('Received control message:', msg);
      if (msg.type === 'disconnect') {
        await client.disconnect();
        sendMessage({ type: 'disconnected' });
        process.exit(0);
      }
    });

    console.log('RelayApp worker is running...');
  } catch (error) {
    console.error('Fatal error in runRelayApp:', error);
    sendMessage({ type: 'error', error: error.message });
    process.exit(1);
  }
}

runRelayApp().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});