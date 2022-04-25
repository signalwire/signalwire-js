import { toInternalDevices, createDialer, createPlaylist } from './utils'

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

describe('createDialer', () => {
  it('should build a list of devices to dial', () => {
    const dialer = createDialer()

    dialer
      .addPhone({ from: '+1', to: '+2', timeout: 30 })
      .addSip({
        from: 'sip:one',
        to: 'sip:two',
        headers: [{ name: 'foo', value: 'bar' }],
      })
      .inParallel(
        createDialer()
          .addPhone({ from: '+3', to: '+4' })
          .addSip({
            from: 'sip:three',
            to: 'sip:four',
            headers: [{ name: 'baz', value: 'qux' }],
          })
          .addPhone({ from: '+5', to: '+6' })
      )

    expect(dialer.devices).toStrictEqual([
      [
        {
          type: 'phone',
          from: '+1',
          to: '+2',
          timeout: 30,
        },
      ],
      [
        {
          type: 'sip',
          from: 'sip:one',
          to: 'sip:two',
          headers: [{ name: 'foo', value: 'bar' }],
        },
      ],
      [
        {
          type: 'phone',
          from: '+3',
          to: '+4',
        },
        {
          type: 'sip',
          from: 'sip:three',
          to: 'sip:four',
          headers: [{ name: 'baz', value: 'qux' }],
        },
        {
          type: 'phone',
          from: '+5',
          to: '+6',
        },
      ],
    ])
  })

  it('should build a list of devices to dial including region', () => {
    const dialer = createDialer({ region: 'us' })
    dialer.inParallel(
      createDialer()
        .addPhone({ from: '+3', to: '+4' })
        .addPhone({ from: '+5', to: '+6' })
    )

    expect(dialer.region).toBe('us')
    expect(dialer.devices).toStrictEqual([
      [
        {
          type: 'phone',
          from: '+3',
          to: '+4',
        },
        {
          type: 'phone',
          from: '+5',
          to: '+6',
        },
      ],
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
