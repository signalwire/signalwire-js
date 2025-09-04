import {
  GetAddressResponse,
  GetAddressesResult,
  SignalWireClient,
} from '@signalwire/client'
import { test, expect, CustomPage } from '../../fixtures'
import { SERVER_URL, createCFClient, expectPageEvalToPass } from '../../utils'

test.describe('Addresses', () => {
  test('query multiple addresses and single address', async ({
    createCustomPage,
  }) => {
    let addressById = {} as GetAddressResponse
    let addressByName = {} as GetAddressResponse
    let addressToCompare = {} as GetAddressResponse
    let page = {} as CustomPage

    await test.step('setup page and client', async () => {
      page = await createCustomPage({ name: '[page]' })
      await page.goto(SERVER_URL)
      await createCFClient(page)
    })

    await test.step('query multiple addresses and select one for comparison', async () => {
      addressToCompare = await expectPageEvalToPass(page, {
        assertionFn: (result) => {
          expect(result, 'second address should be defined').toBeDefined()
        },
        evaluateFn: async () => {
          const client = window._client

          if (!client) {
            throw new Error('Client not found')
          }

          const response = await client.address.getAddresses()

          return response.data[1]
        },
        message: 'expect to get multiple addresses',
      })

      expect(
        addressToCompare,
        'address to compare should be defined'
      ).toBeDefined()
      expect(
        addressToCompare.id,
        'address to compare should have an id'
      ).toBeDefined()
    })

    await test.step('query address by ID', async () => {
      addressById = await expectPageEvalToPass(page, {
        assertionFn: (result) => {
          expect(result, 'address by ID should be defined').toBeDefined()
          expect(
            result.id,
            'address by ID should have correct id'
          ).toBeDefined()
        },
        evaluateArgs: { addressId: addressToCompare.id },
        evaluateFn: async (params) => {
          const client = window._client

          if (!client) {
            throw new Error('Client not found')
          }

          return await client.address.getAddress({
            id: params.addressId,
          })
        },
        message: 'expect to get address by ID',
      })
    })

    await test.step('query address by name', async () => {
      addressByName = await expectPageEvalToPass(page, {
        assertionFn: (result) => {
          expect(result, 'address by name should be defined').toBeDefined()
          expect(
            result.id,
            'address by name should have correct id'
          ).toBeDefined()
        },
        evaluateArgs: { addressName: addressToCompare.name },
        evaluateFn: async (params) => {
          const client = window._client

          if (!client) {
            throw new Error('Client not found')
          }

          return await client.address.getAddress({
            name: params.addressName,
          })
        },
        message: 'expect to get address by name',
      })
    })

    await test.step('verify addresses match', async () => {
      expect(
        addressById.id,
        'address queried by ID should match original address ID'
      ).toEqual(addressToCompare.id)
      expect(
        addressByName.id,
        'address queried by name should match original address ID'
      ).toEqual(addressToCompare.id)
    })
  })

  test('Should return only type rooms in ASC order by name', async ({
    createCustomPage,
  }) => {
    let addressesResponse = {} as GetAddressesResult
    let page = {} as CustomPage

    await test.step('setup page and client', async () => {
      page = await createCustomPage({ name: '[page]' })
      await page.goto(SERVER_URL)
      await createCFClient(page)
    })

    await test.step('query filtered and sorted addresses', async () => {
      addressesResponse = await expectPageEvalToPass(page, {
        assertionFn: (result) => {
          expect(result, 'addresses response should be defined').toBeDefined()
          expect(result.data, 'addresses data should be defined').toBeDefined()
          expect(
            result.data.length,
            'should have at least 1 address'
          ).toBeGreaterThan(0)
        },
        evaluateFn: async () => {
          const client = window._client

          if (!client) {
            throw new Error('Client not found')
          }

          return await client.address.getAddresses({
            type: 'room',
            sortBy: 'name',
            sortOrder: 'asc',
            pageSize: 3,
          })
        },
        message: 'expect to get filtered and sorted addresses',
      })
    })

    await test.step('verify addresses are sorted correctly', async () => {
      const addressNames = addressesResponse.data.map((addr) => addr.name)

      // Verify we have addresses to test
      expect(
        addressNames.length,
        'should have addresses to verify sorting'
      ).toBeGreaterThan(0)

      // Verify all addresses are type 'room'
      addressesResponse.data.forEach((addr) => {
        expect(addr.type, `address ${addr.name} should be of type 'room'`).toBe(
          'room'
        )
      })

      // Verify addresses are sorted in ascending order
      for (let i = 0; i < addressNames.length - 1; i++) {
        expect(
          addressNames[i] <= addressNames[i + 1],
          `address '${addressNames[i]}' should come before or equal '${
            addressNames[i + 1]
          }' in ascending order`
        ).toBeTruthy()
      }
    })
  })

  // TODO unskip this test once this is sorted out in the backend.
  /*
  Rails is currently sorting this wrongly
  [page] 2024-09-12T14:21:56.299Z - [getAddresses] query URL /api/fabric/addresses?type=room&page_size=3&sort_by=name&sort_order=desc
  [page] with-preview-ygqdk
  [page] with-preview
  [page] without-preview

  correct sorting...

  Welcome to Node.js v20.12.1.
  Type ".help" for more information.
  > let names = ["with-preview-ygqdk", "with-preview", "without-preview"]
  undefined
  > names
  [ 'with-preview-ygqdk', 'with-preview', 'without-preview' ]
  > names.sort()
  [ 'with-preview', 'with-preview-ygqdk', 'without-preview' ]

  */
  test.skip('Should return only type rooms in DESC order by name', async ({
    createCustomPage,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    await createCFClient(page)

    const isCorrectlySorted = await page.evaluate(async () => {
      // @ts-expect-error
      const client: SignalWireClient = window._client

      const response = await client.address.getAddresses({
        type: 'room',
        sortBy: 'name',
        sortOrder: 'desc',
        pageSize: 3,
      })

      const isSorted = (arr: string[]) => {
        for (let i = 0; i < arr.length - 1; i++) {
          if (arr[i] < arr[i + 1]) {
            return false
          }
        }

        return true
      }

      return isSorted(
        response.data.map((addr) => {
          console.log(addr.name)
          return addr.name
        })
      )
    })

    expect(isCorrectlySorted).toBeTruthy()
  })
})
