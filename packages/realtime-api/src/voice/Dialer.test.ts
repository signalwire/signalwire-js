import { Dialer } from './Dialer'

describe('Dialer', () => {
  it('should build a list of devices to dial', () => {
    const dialer = new Dialer()

    dialer
      .add(Dialer.Phone({ from: '+1', to: '+2', timeout: 30 }))
      .add(
        Dialer.Sip({
          from: 'sip:one',
          to: 'sip:two',
          headers: [{ name: 'foo', value: 'bar' }],
        })
      )
      .add([
        Dialer.Phone({ from: '+3', to: '+4' }),
        Dialer.Sip({
          from: 'sip:three',
          to: 'sip:four',
          headers: [{ name: 'baz', value: 'qux' }],
        }),
        Dialer.Phone({ from: '+5', to: '+6' }),
      ])

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
    const dialer = new Dialer({ region: 'us' })
    dialer.add([
      Dialer.Phone({ from: '+3', to: '+4' }),
      Dialer.Phone({ from: '+5', to: '+6' }),
    ])

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
