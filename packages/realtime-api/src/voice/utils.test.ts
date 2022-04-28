import { toInternalDevices, createPlaylist } from './utils'

describe('toInternalDevices', () => {
  it('should convert the user facing interface to the internal one', () => {
    expect(
      toInternalDevices([
        [
          {
            type: 'phone',
            to: '+12083660792',
            from: '+15183601338',
            timeout: 30,
          },
        ],
      ])
    ).toEqual([
      [
        {
          type: 'phone',
          params: {
            to_number: '+12083660792',
            from_number: '+15183601338',
            timeout: 30,
          },
        },
      ],
    ])

    expect(
      toInternalDevices([
        {
          type: 'phone',
          to: '+12083660792',
          from: '+15183601338',
        },
        [
          {
            type: 'sip',
            to: '+12083660791',
            from: '+15183601331',
            timeout: 30,
          },
          {
            type: 'phone',
            to: '+12083660793',
            from: '+15183601138',
          },
        ],
        [
          {
            type: 'phone',
            to: '+12083660793',
            from: '+15183601138',
          },
          {
            type: 'phone',
            to: '+12083660793',
            from: '+15183601138',
          },
          {
            type: 'phone',
            to: '+12083660793',
            from: '+15183601138',
          },
        ],
        {
          type: 'phone',
          to: '+12083660793',
          from: '+15183601138',
        },
      ])
    ).toEqual([
      {
        type: 'phone',
        params: {
          to_number: '+12083660792',
          from_number: '+15183601338',
        },
      },
      [
        {
          type: 'sip',
          params: {
            to: '+12083660791',
            from: '+15183601331',
            timeout: 30,
          },
        },
        {
          type: 'phone',
          params: {
            to_number: '+12083660793',
            from_number: '+15183601138',
          },
        },
      ],
      [
        {
          type: 'phone',
          params: {
            to_number: '+12083660793',
            from_number: '+15183601138',
          },
        },
        {
          type: 'phone',
          params: {
            to_number: '+12083660793',
            from_number: '+15183601138',
          },
        },
        {
          type: 'phone',
          params: {
            to_number: '+12083660793',
            from_number: '+15183601138',
          },
        },
      ],
      {
        type: 'phone',
        params: {
          to_number: '+12083660793',
          from_number: '+15183601138',
        },
      },
    ])
  })
})

describe('createPlaylist', () => {
  it('should build a list of devices to dial', () => {
    const playlist = createPlaylist()
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
    const playlist = createPlaylist({ volume: 2 })
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
