import { uuid } from '@signalwire/core'
import {
  SignalWireClient,
  ConversationMessageEventParams,
} from '@signalwire/client'
import { test, expect } from '../../fixtures'
import { SERVER_URL, createCFClient } from '../../utils'

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

    const roomName = `e2e-client-convo-room_${uuid()}`
    await resource.createVideoRoomResource(roomName)

    const firstMsgEvent = await page.evaluate(
      ({ roomName }) => {
        return new Promise<ConversationMessageEventParams>(async (resolve) => {
          // @ts-expect-error
          const client: SignalWireClient = window._client
          const addresses = await client.address.getAddresses({
            displayName: roomName,
          })
          const fromAddressId = (await client.address.getMyAddresses())[0].id
          console.log('fromAddressId:', fromAddressId)

          const roomAddress = addresses.data[0]
          const addressId = roomAddress.id

          let joinResponse
          // Note: subscribe will trigger for call logs too
          // we need to make sure call logs don't resolve promise
          client.conversation.subscribe((event) => {
            if (event.subtype == 'chat') {
              // FIXME: work around since address_id was removed from the event
              resolve({
                ...event,
                address_id: addressId,
              })
            }
          })

          joinResponse = await client.conversation.join({
            addressIds: [addressId, fromAddressId],
            fromAddressId,
          })

          client.conversation.sendMessage({
            conversationId: joinResponse.conversationId,
            text: '1st message from 1st subscriber',
            fromAddressId,
          })
        })
      },
      { roomName }
    )

    expect(firstMsgEvent.type).toBe('message')
    console.log('firstMsgEvent:', firstMsgEvent)
    // FIXME: this is not a good test
    // the address_id was removed from the event, but we need a way to find the conversation
    const addressId = firstMsgEvent.address_id

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
      ({ addressId, roomName }) => {
        // FIXME: this is not a good test
        // the address_id was removed from the event, but we need a way to find the conversation
        if (!addressId) {
          //@ts-expect-error
          addressId = window._addressId
        }
        return new Promise<ConversationMessageEventParams>(async (resolve) => {
          // @ts-expect-error
          const client: SignalWireClient = window._client
          const fromAddressId = (await client.address.getMyAddresses())[0].id
          // Note: subscribe will trigger for call logs too
          // we need to make sure call logs don't resolve promise
          client.conversation.subscribe((event) => {
            if (event.subtype == 'chat') {
              resolve(event)
            }
          })
          // TODO???
          // const result = await client.conversation.getConversations()
          // const convo = result.data.filter((c) => c.id == addressId)[0]
          console.log('fromAddressId:', fromAddressId)
          const joinResponse = await client.conversation.join({
            addressIds: [addressId, fromAddressId],
            fromAddressId,
          })

          client.conversation.sendMessage({
            conversationId: joinResponse.conversationId,
            text: '1st message from 2nd subscriber',
            fromAddressId,
          })
        })
      },
      { addressId, roomName }
    )

    const secondMsgEventFromPage1 = await secondMsgEventPromiseFromPage1
    expect(secondMsgEventFromPage1).not.toBeUndefined()

    expect(secondMsgEventFromPage1.type).toBe('message')

    expect(firstMsgEventFromPage2).not.toBeUndefined()

    expect(firstMsgEventFromPage2.type).toBe('message')

    const messages = await page.evaluate(
      async ({ addressId }) => {
        // @ts-expect-error
        const client: SignalWireClient = window._client
        // TODO???
        // const result = await client.conversation.getConversations()
        // const convo = result.data.filter((c) => c.id == addressId)[0]
        const fromAddressId = (await client.address.getMyAddresses())[0].id

        console.log('fromAddressId:', fromAddressId)
        const joinResponse = await client.conversation.join({
          addressIds: [addressId, fromAddressId],
          fromAddressId,
        })
        return await client.conversation.getConversationMessages({
          addressId: joinResponse.conversationId,
        })
      },
      { addressId }
    )

    expect(messages).not.toBeUndefined()

    // Note: even though we are only sending 2 messages
    // there can be call logs inside the messages
    expect(messages.data.length).toBeGreaterThanOrEqual(2)

    expect(messages.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          // conversation_id: addressId,
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
          // conversation_id: addressId,
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
