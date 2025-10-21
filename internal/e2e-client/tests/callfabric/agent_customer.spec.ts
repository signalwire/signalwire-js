import { uuid } from '@signalwire/core'
import { test, expect, CustomPage } from '../../fixtures'
import {
  SERVER_URL,
  createCFClient,
  createGuestCFClient,
  dialAddress,
  expectCFFinalEvents,
  expectCFInitialEvents,
  expectTotalAudioEnergyToBeGreaterThan,
  expectPageEvalToPass,
  getResourceAddresses,
  Resource,
} from '../../utils'

const agent_customer_static_scripts_desc =
  'Call Agent/Customer interaction, static cXML scripts'
test.describe(agent_customer_static_scripts_desc, () => {
  const conference_name = `e2e_${uuid()}`

  const cXMLScriptAgentContent = {
    call_handler_script: `<?xml version="1.0" encoding="UTF-8"?><Response><Dial><Conference>${conference_name}</Conference></Dial></Response>`,
  }
  const cXMLScriptCustomerContent = {
    call_handler_script: `<?xml version="1.0" encoding="UTF-8"?><Response><Dial><Conference>${conference_name}</Conference></Dial></Response>`,
  }

  test('agent and customer should dial an address linked to a static cXML script and expect to join a Conference', async ({
    createCustomPage,
    resource,
  }) => {
    let agentPage = {} as CustomPage
    let customerPage = {} as CustomPage
    let agentResourceData = {} as Resource
    let customerResourceData = {} as Resource
    let allowedAddresses = [] as string[]
    let expectInitialEventsForAgent: Promise<
      [[boolean, boolean, boolean], ...boolean[]]
    >
    let expectInitialEventsForCustomer: Promise<
      [[boolean, boolean, boolean], ...boolean[]]
    >
    let customerFinalEvents: Promise<[boolean, ...boolean[]]>
    let agentFinalEvents: Promise<[boolean, ...boolean[]]>

    await test.step('setup agent page and resource', async () => {
      agentPage = await createCustomPage({ name: '[agent_page]' })
      await agentPage.goto(SERVER_URL)

      const agentResourceName = `e2e_${uuid()}`
      agentResourceData = await resource.createcXMLScriptResource({
        name: agentResourceName,
        contents: cXMLScriptAgentContent,
      })

      expect(
        agentResourceData.cxml_script?.id,
        'agent cXML script should be created'
      ).toBeDefined()

      await createCFClient(agentPage)

      await dialAddress(agentPage, {
        address: `/public/${agentResourceName}`,
        shouldWaitForJoin: false,
        shouldStartCall: false,
      })
    })

    await test.step('start agent call', async () => {
      expectInitialEventsForAgent = expectCFInitialEvents(agentPage, [])

      await expectPageEvalToPass(agentPage, {
        evaluateFn: async () => {
          const call = window._callObj

          if (!call) {
            throw new Error('Agent call object not found')
          }

          await call.start()
          return true
        },
        assertionFn: (result) => {
          expect(result, 'agent call should start successfully').toBe(true)
        },
        message: 'expect agent call to start',
      })

      await expectInitialEventsForAgent
    })

    await test.step('setup customer page and resource', async () => {
      customerPage = await createCustomPage({ name: '[customer_page]' })
      await customerPage.goto(SERVER_URL)

      const customerResourceName = `e2e_${uuid()}`
      customerResourceData = await resource.createcXMLScriptResource({
        name: customerResourceName,
        contents: cXMLScriptCustomerContent,
      })

      expect(
        customerResourceData.id,
        'customer resource should be created'
      ).toBeDefined()

      const resourceAddresses = await getResourceAddresses(
        customerResourceData.id
      )
      allowedAddresses = resourceAddresses.data.map(
        (address: { id: string }) => address.id ?? ''
      )

      expect(
        allowedAddresses.length,
        'should have allowed addresses for customer'
      ).toBeGreaterThan(0)

      await createGuestCFClient(customerPage, {
        allowed_addresses: allowedAddresses,
      })

      await dialAddress(customerPage, {
        address: `/public/${customerResourceName}`,
        shouldWaitForJoin: false,
        shouldStartCall: false,
      })
    })

    await test.step('start customer call', async () => {
      // Let the Agent wait a little before the Customer joins
      await customerPage.waitForTimeout(2000)

      expectInitialEventsForCustomer = expectCFInitialEvents(customerPage, [])

      await expectPageEvalToPass(customerPage, {
        evaluateFn: async () => {
          const call = window._callObj

          if (!call) {
            throw new Error('Customer call object not found')
          }

          await call.start()
          return true
        },
        assertionFn: (result) => {
          expect(result, 'customer call should start successfully').toBe(true)
        },
        message: 'expect customer call to start',
      })

      await expectInitialEventsForCustomer
    })

    await test.step('verify audio communication', async () => {
      // Wait for 5 seconds of call time
      await customerPage.waitForTimeout(5000)

      await expectTotalAudioEnergyToBeGreaterThan(agentPage, 0.15)
      await expectTotalAudioEnergyToBeGreaterThan(customerPage, 0.15)
    })

    await test.step('cleanup calls', async () => {
      // Attach final listeners
      customerFinalEvents = expectCFFinalEvents(customerPage)
      agentFinalEvents = expectCFFinalEvents(agentPage)

      // Hangup customer
      await expectPageEvalToPass(customerPage, {
        evaluateFn: async () => {
          const call = window._callObj

          if (!call) {
            throw new Error('Customer call object not found')
          }

          await call.hangup()
          return true
        },
        assertionFn: (result) => {
          expect(result, 'customer call should hangup successfully').toBe(true)
        },
        message: 'expect customer call to hangup',
      })

      // Hangup agent
      await expectPageEvalToPass(agentPage, {
        evaluateFn: async () => {
          const call = window._callObj

          if (!call) {
            throw new Error('Agent call object not found')
          }

          await call.hangup()
          return true
        },
        assertionFn: (result) => {
          expect(result, 'agent call should hangup successfully').toBe(true)
        },
        message: 'expect agent call to hangup',
      })

      await Promise.all([customerFinalEvents, agentFinalEvents])
    })
  })
})

const agent_customer_external_url_desc =
  'CallCall Agent/Customer interaction, cXML with external URL'
test.describe(agent_customer_external_url_desc, () => {
  const external_url_for_cxml = process.env.EXTERNAL_URL_FOR_CXML

  const cXMLExternalURLAgent = {
    primary_request_url: external_url_for_cxml,
  }
  const cXMLExternalURLCustomer = {
    primary_request_url: external_url_for_cxml,
  }

  test('agent and customer should dial an address linked to a cXML script with external URL and expect to join a Conference', async ({
    createCustomPage,
    resource,
  }) => {
    let agentPage = {} as CustomPage
    let customerPage = {} as CustomPage
    let agentResourceData = {} as Resource
    let customerResourceData = {} as Resource
    let allowedAddresses = [] as string[]
    let expectInitialEventsForAgent: Promise<
      [[boolean, boolean, boolean], ...boolean[]]
    >
    let expectInitialEventsForCustomer: Promise<
      [[boolean, boolean, boolean], ...boolean[]]
    >
    let customerFinalEvents: Promise<[boolean, ...boolean[]]>
    let agentFinalEvents: Promise<[boolean, ...boolean[]]>

    await test.step('setup agent page and external URL resource', async () => {
      agentPage = await createCustomPage({ name: '[agent_page]' })
      await agentPage.goto(SERVER_URL)

      const agentResourceName = `e2e_${uuid()}`
      agentResourceData = await resource.createcXMLExternalURLResource({
        name: agentResourceName,
        contents: cXMLExternalURLAgent,
      })

      expect(
        agentResourceData.cxml_webhook?.id,
        'agent cXML webhook should be created'
      ).toBeDefined()

      await createCFClient(agentPage)

      await dialAddress(agentPage, {
        address: `/public/${agentResourceName}`,
        shouldWaitForJoin: false,
        shouldStartCall: false,
      })
    })

    await test.step('start agent call', async () => {
      expectInitialEventsForAgent = expectCFInitialEvents(agentPage, [])

      await expectPageEvalToPass(agentPage, {
        evaluateFn: async () => {
          const call = window._callObj

          if (!call) {
            throw new Error('Agent call object not found')
          }

          await call.start()
          return true
        },
        assertionFn: (result) => {
          expect(result, 'agent call should start successfully').toBe(true)
        },
        message: 'expect agent call to start',
      })

      await expectInitialEventsForAgent
    })

    await test.step('setup customer page and external URL resource', async () => {
      customerPage = await createCustomPage({ name: '[customer_page]' })
      await customerPage.goto(SERVER_URL)

      const customerResourceName = `e2e_${uuid()}`
      customerResourceData = await resource.createcXMLExternalURLResource({
        name: customerResourceName,
        contents: cXMLExternalURLCustomer,
      })

      expect(
        customerResourceData.id,
        'customer external URL resource should be created'
      ).toBeDefined()

      const resourceAddresses = await getResourceAddresses(
        customerResourceData.id
      )
      allowedAddresses = resourceAddresses.data.map(
        (address: { id: string }) => address.id ?? ''
      )

      expect(
        allowedAddresses.length,
        'should have allowed addresses for customer'
      ).toBeGreaterThan(0)

      await createGuestCFClient(customerPage, {
        allowed_addresses: allowedAddresses,
      })

      await dialAddress(customerPage, {
        address: `/public/${customerResourceName}`,
        shouldWaitForJoin: false,
        shouldStartCall: false,
      })
    })

    await test.step('start customer call', async () => {
      // Let the Agent wait a little before the Customer joins
      await customerPage.waitForTimeout(2000)

      expectInitialEventsForCustomer = expectCFInitialEvents(customerPage, [])

      await expectPageEvalToPass(customerPage, {
        evaluateFn: async () => {
          const call = window._callObj

          if (!call) {
            throw new Error('Customer call object not found')
          }

          await call.start()
          return true
        },
        assertionFn: (result) => {
          expect(result, 'customer call should start successfully').toBe(true)
        },
        message: 'expect customer call to start',
      })

      await expectInitialEventsForCustomer
    })

    await test.step('verify audio communication', async () => {
      // Wait for 5 seconds of call time
      await customerPage.waitForTimeout(5000)

      await expectTotalAudioEnergyToBeGreaterThan(agentPage, 0.15)
      await expectTotalAudioEnergyToBeGreaterThan(customerPage, 0.15)
    })

    await test.step('cleanup calls', async () => {
      // Attach final listeners
      customerFinalEvents = expectCFFinalEvents(customerPage)
      agentFinalEvents = expectCFFinalEvents(agentPage)

      // Hangup customer
      await expectPageEvalToPass(customerPage, {
        evaluateFn: async () => {
          const call = window._callObj

          if (!call) {
            throw new Error('Customer call object not found')
          }

          await call.hangup()
          return true
        },
        assertionFn: (result) => {
          expect(result, 'customer call should hangup successfully').toBe(true)
        },
        message: 'expect customer call to hangup',
      })

      // Hangup agent
      await expectPageEvalToPass(agentPage, {
        evaluateFn: async () => {
          const call = window._callObj

          if (!call) {
            throw new Error('Agent call object not found')
          }

          await call.hangup()
          return true
        },
        assertionFn: (result) => {
          expect(result, 'agent call should hangup successfully').toBe(true)
        },
        message: 'expect agent call to hangup',
      })

      await Promise.all([customerFinalEvents, agentFinalEvents])
    })
  })
})

// TODO: Enable when ready
// const customer_stream_desc = 'CallCall Customer connecting to stream'
// test.describe(customer_stream_desc, () => {
//   test('customer should dial an address linked to a cXML script connecting to a conference with stream', async ({
//     createCustomPage,
//     resource,
//   }) => {

//     const conference_name = `e2e_${uuid()}`
//     const stream_url = `${process.env.CXML_STREAM_URL}`

//     const cXMLScriptCustomerContent = {
//      call_handler_script: `<?xml version="1.0" encoding="UTF-8"?><Response><Dial><Conference addStream="true" streamUrl="${stream_url}">${conference_name}</Conference></Dial></Response>`
//    }

//     console.log('--------- creating customer ------------------')
//     // Customer
//     const customer_page = await createCustomPage({ name: '[customer_page]' })
//     await customer_page.goto(SERVER_URL)

//     const customerResourceName = `e2e_${uuid()}`
//     const customer_resource_data = await resource.createcXMLScriptResource({
//       name: customerResourceName,
//       contents: cXMLScriptCustomerContent,
//     })

//     expect(customer_resource_data.id).toBeDefined()
//     const resource_addresses = await getResourceAddresses(customer_resource_data.id)
//     const allowed_addresses: string[] = resource_addresses.data.map((address: { id: any }) => address.id ?? '')

//     console.log("Allowed addresses: ", allowed_addresses, " <---------------")

//     await createGuestCFClient(customer_page, { allowed_addresses: allowed_addresses})

//     await dialAddress(customer_page, {
//       address: `/private/${customerResourceName}`, // or /public/?
//       shouldWaitForJoin: false,
//       shouldStartCall: false
//     })

//     const expectInitialEventsForCustomer = expectCFInitialEvents(customer_page, [])
//     await customer_page.evaluate(async () => {
//       // @ts-expect-error
//       const call = window._callObj

//       await call.start()
//     })
//     await expectInitialEventsForCustomer

//     // 10 seconds' call
//     await customer_page.waitForTimeout(10000)

//     console.log("Expect to have received some audio...")
//     await expectTotalAudioEnergyToBeGreaterThan(customer_page, 0.01)

//     // Attach final listeners
//     const customerFinalEvents = expectCFFinalEvents(customer_page)

//     console.log("Test done - hanging up customer")

//     await customer_page.evaluate(async () => {
//       // @ts-expect-error
//       const call = window._callObj

//       await call.hangup()
//     })

//     await customerFinalEvents
//     console.log("Test done -", customer_stream_desc)
//   })
// })
