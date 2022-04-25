import { toInternalDevices, createDialer } from './utils'

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
