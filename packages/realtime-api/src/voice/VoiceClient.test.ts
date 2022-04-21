import { Client } from './VoiceClient'

describe('VideoClient', () => {
  describe('Client', () => {
    const token = '<jwt>'

    describe('createPlaylist', () => {
      it('should build a list of devices to dial', () => {
        const voice = new Client({
          project: 'some-project',
          token,
          contexts: ['test'],
        })

        const playlist = voice.createPlaylist()
        playlist.playAudio({ url: 'https://example.com/hello.mp3' })
        playlist.playSilence({ duration: 5 })
        playlist.playTTS({ text: 'Hello World' })
        playlist.playRingtone({ name: 'us' })
        playlist.playAudio({ url: 'https://example.com/hello2.mp3' })

        expect(playlist.media).toStrictEqual([
          {
            type: 'audio',
            url: 'https://example.com/hello.mp3',
          },
          {
            type: 'silence',
            duration: 5,
          },
          {
            type: 'tts',
            text: 'Hello World',
          },
          {
            type: 'ringtone',
            name: 'us',
          },
          {
            type: 'audio',
            url: 'https://example.com/hello2.mp3',
          },
        ])
      })

      it('should build a list of devices to dial including volume', () => {
        const voice = new Client({
          project: 'some-project',
          token,
          contexts: ['test'],
        })

        const playlist = voice.createPlaylist({ volume: 2 })
        playlist.playAudio({ url: 'https://example.com/hello.mp3' })
        playlist.playSilence({ duration: 5 })
        playlist.playTTS({ text: 'Hello World' })

        expect(playlist.volume).toBe(2)
        expect(playlist.media).toStrictEqual([
          {
            type: 'audio',
            url: 'https://example.com/hello.mp3',
          },
          {
            type: 'silence',
            duration: 5,
          },
          {
            type: 'tts',
            text: 'Hello World',
          },
        ])
      })
    })
  })
})
