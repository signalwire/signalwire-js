import { Client } from './VoiceClient'

describe('VideoClient', () => {
  describe('Client', () => {
    const token = '<jwt>'

    describe('createDialer', () => {
      it('should build a list of devices to dial', () => {
        const voice = new Client({
          project: 'some-project',
          token,
          contexts: ['test'],
        })

        const dialer = voice.createDialer()

        dialer
          .dialPhone({ from: '+1', to: '+2', timeout: 30 })
          .dialSip({
            from: 'sip:one',
            to: 'sip:two',
            headers: [{ name: 'foo', value: 'bar' }],
          })
          .inParallel(
            voice
              .createDialer()
              .dialPhone({ from: '+3', to: '+4' })
              .dialSip({
                from: 'sip:three',
                to: 'sip:four',
                headers: [{ name: 'baz', value: 'qux' }],
              })
              .dialPhone({ from: '+5', to: '+6' })
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
        const voice = new Client({
          project: 'some-project',
          token,
          contexts: ['test'],
        })

        const dialer = voice.createDialer({ region: 'us' })
        dialer.inParallel(
          voice
            .createDialer()
            .dialPhone({ from: '+3', to: '+4' })
            .dialPhone({ from: '+5', to: '+6' })
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
  })
})
