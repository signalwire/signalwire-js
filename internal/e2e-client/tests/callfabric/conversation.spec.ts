import { uuid } from '@signalwire/core'
import {
  SignalWireClient,
  ConversationMessageEventParams,
  Address,
} from '@signalwire/client'
import { test, expect } from '../../fixtures'
import { SERVER_URL, createCFClient } from '../../utils'

// FIXME: Enable this test once the issue with conversation APIs is resolved
test.describe('Conversation Room', () => {
  test('send message in a room conversation', async ({
    createCustomPage,
    resource,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    const page2 = await createCustomPage({
      name: '[page2]',
    })
    await page.goto(SERVER_URL)
    await page2.goto(SERVER_URL)

    await createCFClient(page)
    await createCFClient(page2)

    const roomName = `e2e_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    const roomAddress = await page.evaluate(
      ({ roomName }) => {
        return new Promise<Address>(async (resolve) => {
          // @ts-expect-error
          const client: SignalWireClient = window._client
          const addresses = await client.address.getAddresses({
            displayName: roomName,
          })
          resolve(addresses.data[0])
        })
      },
      { roomName }
    )

    const firstMsgEvent = await page.evaluate(
      ({ roomAddress }) => {
        return new Promise<ConversationMessageEventParams>(async (resolve) => {
          // @ts-expect-error
          const client: SignalWireClient = window._client

          const from_address_id = (await client.address.getMyAddresses())[0].id
          console.log('from_address_id:', from_address_id)

          const addressId = roomAddress.id
          // Note: subscribe will trigger for call logs too
          // we need to make sure call logs don't resolve promise
          client.conversation.subscribe((event) => {
            if (event.subtype == 'chat') {
              resolve(event)
            }
          })

          const joinResponse = await client.conversation.join({
            addressIds: [addressId, from_address_id],
            from_address_id,
          })

          client.conversation.sendMessage({
            group_id: joinResponse.group_id,
            text: '1st message from 1st subscriber',
            from_address_id,
          })
        })
      },
      { roomAddress }
    )

    expect(firstMsgEvent.type).toBe('message')
    console.log('firstMsgEvent:', firstMsgEvent)
    const group_id = firstMsgEvent.group_id

    const secondMsgEventPromiseFromPage1 = page.evaluate(() => {
      return new Promise<ConversationMessageEventParams>((resolve) => {
        // @ts-expect-error
        const client: SignalWireClient = window._client
        // Note: subscribe will trigger for call logs too
        // we need to make sure call logs don't resolve promise
        client.conversation.subscribe((event) => {
          // Note we need to do this
          if (event.subtype == 'chat') {
            resolve(event)
          }
        })
      })
    })

    const firstMsgEventFromPage2 = await page2.evaluate(
      ({ roomAddress }) => {
        return new Promise<ConversationMessageEventParams>(async (resolve) => {
          // @ts-expect-error
          const client: SignalWireClient = window._client
          const from_address_id = (await client.address.getMyAddresses())[0].id
          // Note: subscribe will trigger for call logs too
          // we need to make sure call logs don't resolve promise
          client.conversation.subscribe((event) => {
            if (event.subtype == 'chat') {
              resolve(event)
            }
          })
          const joinResponse = await client.conversation.join({
            addressIds: [roomAddress.id, from_address_id],
            from_address_id,
          })

          client.conversation.sendMessage({
            group_id: joinResponse.group_id,
            text: '1st message from 2nd subscriber',
            from_address_id,
          })
        })
      },
      { roomAddress }
    )

    const secondMsgEventFromPage1 = await secondMsgEventPromiseFromPage1
    expect(secondMsgEventFromPage1).not.toBeUndefined()

    expect(secondMsgEventFromPage1.type).toBe('message')

    expect(firstMsgEventFromPage2).not.toBeUndefined()

    expect(firstMsgEventFromPage2.type).toBe('message')

    const messages = await page.evaluate(
      async ({ group_id }) => {
        // @ts-expect-error
        const client: SignalWireClient = window._client
        return await client.conversation.getConversationMessages({
          group_id,
        })
      },
      { group_id }
    )

    expect(messages).not.toBeUndefined()

    // Note: even though we are only sending 2 messages
    // there can be call logs inside the messages
    expect(messages.data.length).toBeGreaterThanOrEqual(2)

    expect(messages.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          details: {},
          id: expect.anything(),
          kind: null,
          subtype: 'chat',
          text: '1st message from 2nd subscriber',
          ts: expect.anything(),
          type: 'message',
          from_address_id: expect.anything(),
        }),
        expect.objectContaining({
          details: {},
          id: expect.anything(),
          kind: null,
          subtype: 'chat',
          text: '1st message from 1st subscriber',
          ts: expect.anything(),
          type: 'message',
          from_address_id: expect.anything(),
        }),
      ])
    )
  })
})
