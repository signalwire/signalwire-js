import { uuid } from '@signalwire/core'
import { ConversationMessageEventParams, Address } from '@signalwire/client'
import { test, expect, CustomPage } from '../../fixtures'
import { SERVER_URL, createCFClient, expectPageEvalToPass } from '../../utils'

// FIXME: Enable this test once the issue with conversation APIs is resolved
test.describe('Conversation Room', () => {
  test('send message in a room conversation', async ({
    createCustomPage,
    resource,
  }) => {
    let page = {} as CustomPage
    let page2 = {} as CustomPage
    let roomName = ''
    let roomAddress = {} as Address
    let firstMsgEvent = {} as ConversationMessageEventParams
    let firstMsgEventFromPage2 = {} as ConversationMessageEventParams
    let secondMsgEventFromPage1 = {} as ConversationMessageEventParams
    let groupId = ''

    await test.step('setup pages and clients', async () => {
      page = await createCustomPage({ name: '[page]' })
      page2 = await createCustomPage({
        name: '[page2]',
      })
      await page.goto(SERVER_URL)
      await page2.goto(SERVER_URL)

      await createCFClient(page)
      await createCFClient(page2)

      roomName = `e2e_${uuid()}`
      await resource.createCallSessionResource(roomName)
    })

    await test.step('get room address', async () => {
      roomAddress = await expectPageEvalToPass(page, {
        evaluateArgs: { roomName },
        evaluateFn: async (params) => {
          const client = window._client

          if (!client) {
            throw new Error('Client not found')
          }

          const addresses = await client.address.getAddresses({
            displayName: params.roomName,
          })
          return addresses.data[0]
        },
        assertionFn: (result) => {
          expect(result, 'room address should be found').toBeDefined()
          expect(result.id, 'room address should have id').toBeDefined()
        },
        message: 'expect to get room address',
      })
    })

    await test.step('setup first message event and send message from page1', async () => {
      let fabricAddressIdPage1 = ''
      let addressId = ''
      let joinResponsePage1 = { group_id: '' }
      let messageSubscriptionPromisePage1: Promise<ConversationMessageEventParams>

      // Step 1: Get fabric address ID for page1
      fabricAddressIdPage1 = await expectPageEvalToPass(page, {
        evaluateFn: async () => {
          const client = window._client

          if (!client) {
            throw new Error('Client not found')
          }

          const myAddresses = await client.address.getMyAddresses()
          return myAddresses[0].id
        },
        assertionFn: (result) => {
          expect(result, 'fabric address ID should be defined').toBeDefined()
          expect(typeof result, 'fabric address ID should be string').toBe(
            'string'
          )
        },
        message: 'expect to get fabric address ID for page1',
      })

      // Step 2: Get room address ID
      addressId = await expectPageEvalToPass(page, {
        evaluateArgs: { roomAddress },
        evaluateFn: async (params) => {
          return params.roomAddress.id
        },
        assertionFn: (result) => {
          expect(result, 'address ID should be defined').toBeDefined()
          expect(typeof result, 'address ID should be string').toBe('string')
        },
        message: 'expect to get room address ID',
      })

      // Step 3: Set up subscription listener on page1
      messageSubscriptionPromisePage1 = expectPageEvalToPass(page, {
        evaluateFn: () => {
          return new Promise<ConversationMessageEventParams>((resolve) => {
            const client = window._client

            if (!client) {
              throw new Error('Client not found')
            }

            // Note: subscribe will trigger for call logs too
            // we need to make sure call logs don't resolve promise
            client.conversation.subscribe((event) => {
              if (event.subtype == 'chat') {
                resolve(event)
              }
            })
          })
        },
        assertionFn: (result) => {
          expect(result, 'first message event should be defined').toBeDefined()
          expect(
            result.type,
            'first message event should be message type'
          ).toBe('message')
        },
        message: 'expect to set up subscription listener on page1',
      })

      // Step 4: Join conversation on page1
      joinResponsePage1 = await expectPageEvalToPass(page, {
        evaluateArgs: { addressId, fabricAddressIdPage1 },
        evaluateFn: async (params) => {
          const client = window._client

          if (!client) {
            throw new Error('Client not found')
          }

          return await client.conversation.join({
            addressIds: [params.addressId, params.fabricAddressIdPage1],
            fromAddressId: params.fabricAddressIdPage1,
          })
        },
        assertionFn: (result) => {
          expect(result, 'join response should be defined').toBeDefined()
          expect(
            result.group_id,
            'join response should have group_id'
          ).toBeDefined()
        },
        message: 'expect to join conversation on page1',
      })

      // Step 5: Send message on page1
      await expectPageEvalToPass(page, {
        evaluateArgs: {
          groupId: joinResponsePage1.group_id,
          fabricAddressIdPage1,
        },
        evaluateFn: async (params) => {
          const client = window._client

          if (!client) {
            throw new Error('Client not found')
          }

          await client.conversation.sendMessage({
            groupId: params.groupId,
            text: '1st message from 1st subscriber',
            fromAddressId: params.fabricAddressIdPage1,
          })

          return true // Simple confirmation that message was sent
        },
        assertionFn: (result) => {
          expect(result, 'message should be sent successfully').toBe(true)
        },
        message: 'expect to send message on page1',
      })

      // Wait for the subscription promise to resolve
      firstMsgEvent = await messageSubscriptionPromisePage1
      groupId = firstMsgEvent.group_id
    })

    await test.step('setup second message event listener on page1', async () => {
      // Set up promise for second message event from page1 (will be resolved later)
      const secondMsgEventPromiseFromPage1 = expectPageEvalToPass(page, {
        evaluateFn: () => {
          return new Promise<ConversationMessageEventParams>((resolve) => {
            const client = window._client

            if (!client) {
              throw new Error('Client not found')
            }

            // Note: subscribe will trigger for call logs too
            // we need to make sure call logs don't resolve promise
            client.conversation.subscribe((event) => {
              // Note we need to do this
              if (event.subtype == 'chat') {
                resolve(event)
              }
            })
          })
        },
        assertionFn: (result) => {
          expect(result, 'second message event should be defined').toBeDefined()
          expect(
            result.type,
            'second message event should be message type'
          ).toBe('message')
        },
        message: 'expect to receive second message event on page1',
      })

      // Break up page2 message sending into separate steps
      let fabricAddressId = ''
      let joinResponse = { group_id: '' }
      let messageSubscriptionPromise: Promise<ConversationMessageEventParams>

      // Step 1: Get fabric address ID for page2
      fabricAddressId = await expectPageEvalToPass(page2, {
        evaluateFn: async () => {
          const client = window._client

          if (!client) {
            throw new Error('Client not found')
          }

          const myAddresses = await client.address.getMyAddresses()
          return myAddresses[0].id
        },
        assertionFn: (result) => {
          expect(result, 'fabric address ID should be defined').toBeDefined()
          expect(typeof result, 'fabric address ID should be string').toBe(
            'string'
          )
        },
        message: 'expect to get fabric address ID for page2',
      })

      // Step 2: Join conversation on page2
      joinResponse = await expectPageEvalToPass(page2, {
        evaluateArgs: { roomAddress, fabricAddressId },
        evaluateFn: async (params) => {
          const client = window._client

          if (!client) {
            throw new Error('Client not found')
          }

          return await client.conversation.join({
            addressIds: [params.roomAddress.id, params.fabricAddressId],
            fromAddressId: params.fabricAddressId,
          })
        },
        assertionFn: (result) => {
          expect(result, 'join response should be defined').toBeDefined()
          expect(
            result.group_id,
            'join response should have group_id'
          ).toBeDefined()
        },
        message: 'expect to join conversation on page2',
      })

      // Step 3: Set up subscription listener on page2
      messageSubscriptionPromise = expectPageEvalToPass(page2, {
        evaluateFn: () => {
          return new Promise<ConversationMessageEventParams>((resolve) => {
            const client = window._client

            if (!client) {
              throw new Error('Client not found')
            }

            // Note: subscribe will trigger for call logs too
            // we need to make sure call logs don't resolve promise
            client.conversation.subscribe((event) => {
              if (event.subtype == 'chat') {
                resolve(event)
              }
            })
          })
        },
        assertionFn: (result) => {
          expect(
            result,
            'subscription message event should be defined'
          ).toBeDefined()
          expect(
            result.type,
            'subscription message event should be message type'
          ).toBe('message')
        },
        message: 'expect to set up subscription listener on page2',
      })

      // Step 4: Send message on page2
      await expectPageEvalToPass(page2, {
        evaluateArgs: { groupId: joinResponse.group_id, fabricAddressId },
        evaluateFn: async (params) => {
          const client = window._client

          if (!client) {
            throw new Error('Client not found')
          }

          await client.conversation.sendMessage({
            groupId: params.groupId,
            text: '1st message from 2nd subscriber',
            fromAddressId: params.fabricAddressId,
          })

          return true // Simple confirmation that message was sent
        },
        assertionFn: (result) => {
          expect(result, 'message should be sent successfully').toBe(true)
        },
        message: 'expect to send message on page2',
      })

      // Wait for both subscription promises to resolve
      firstMsgEventFromPage2 = await messageSubscriptionPromise
      secondMsgEventFromPage1 = await secondMsgEventPromiseFromPage1
    })

    await test.step('verify message events', async () => {
      expect(secondMsgEventFromPage1).toBeDefined()
      expect(secondMsgEventFromPage1.type).toBe('message')
      expect(firstMsgEventFromPage2).toBeDefined()
      expect(firstMsgEventFromPage2.type).toBe('message')
    })

    await test.step('get and verify conversation messages', async () => {
      const messages = await expectPageEvalToPass(page, {
        evaluateArgs: { groupId },
        evaluateFn: async (params) => {
          const client = window._client

          if (!client) {
            throw new Error('Client not found')
          }

          return await client.conversation.getConversationMessages({
            groupId: params.groupId,
          })
        },
        assertionFn: (result) => {
          expect(result, 'messages should be defined').toBeDefined()
          // Note: even though we are only sending 2 messages
          // there can be call logs inside the messages
          expect(
            result.data.length,
            'should have at least 2 messages'
          ).toBeGreaterThanOrEqual(2)
        },
        message: 'expect to get conversation messages',
      })

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
            from_fabric_address_id: expect.anything(),
          }),
          expect.objectContaining({
            details: {},
            id: expect.anything(),
            kind: null,
            subtype: 'chat',
            text: '1st message from 1st subscriber',
            ts: expect.anything(),
            type: 'message',
            from_fabric_address_id: expect.anything(),
          }),
        ])
      )
    })
  })
})
