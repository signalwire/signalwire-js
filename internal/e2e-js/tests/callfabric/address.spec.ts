import { test, expect } from '../../fixtures'
import { SERVER_URL, createCFClient } from '../../utils'

test.describe('Addresses', () => {
  test('query multiple addresses and single address', async ({
    createCustomPage,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    await createCFClient(page)

    const { addressById, addressByName, addressToCompare } =
      await page.evaluate(async () => {
        // @ts-expect-error
        const client = window._client

        const response = await client.address.getAddresses()
        const addressToCompare = response.data[1]

        const addressById = await client.address.getAddress({
          id: addressToCompare.id,
        })

        const addressByName = await client.address.getAddress({
          name: addressToCompare.name,
        })
        return { addressById, addressByName, addressToCompare }
      })

    expect(addressById.id).toEqual(addressToCompare.id)
    expect(addressByName.id).toEqual(addressToCompare.id)
  })

  test('Should return only type rooms in ASC order by name', async ({
    createCustomPage,
  }) => {
    const page = await createCustomPage({ name: '[page]' })
    await page.goto(SERVER_URL)

    await createCFClient(page)

    const isCorrectlySorted = await page.evaluate(async () => {
      // @ts-expect-error
      const client = window._client

      const response = await client.address.getAddresses({
        type: 'room',
        sortBy: 'name',
        sortOrder: 'asc',
        pageSize: 3,
      })

      const isSorted = (arr: string[]) => {
        for (let i = 0; i < arr.length - 1; i++) {
          if (arr[i] > arr[i + 1]) {
            return false
          }
        }

        return true
      }

      return isSorted(
        // @ts-expect-error
        response.data.map((addr) => {
          console.log(addr.name) 
          return addr.name})
      )
    })

    expect(isCorrectlySorted).toBeTruthy()
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
      const client = window._client

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
        // @ts-expect-error
        response.data.map((addr) => {
          console.log(addr.name) 
          return addr.name})
      )
    })

    expect(isCorrectlySorted).toBeTruthy()
  })
})
