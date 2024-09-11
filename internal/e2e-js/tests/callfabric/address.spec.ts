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

  const isSorted = (arr: string[], order: 'asc' | 'desc') => {
    for (let i = 0; i < arr.length - 1; i++) {
      switch (order) {
        case 'asc':
          if (arr[i] >= arr[i + 1]) {
            return false
          }
          break
        case 'desc':
          if (arr[i] <= arr[i + 1]) {
            return false
          }
      }
    }
    return true
  }

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
          if (arr[i] >= arr[i + 1]) {
            return false
          }
        }

        return true
      }

      return isSorted(
        // @ts-expect-error
        response.data.map((addr) => addr.name)
      )
    })

    expect(isCorrectlySorted).toBeTruthy()
  })

  test('Should return only type rooms in DESC order by name', async ({
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
          if (arr[i] <= arr[i + 1]) {
            return false
          }
        }

        return true
      }

      return isSorted(
        // @ts-expect-error
        response.data.map((addr) => addr.name)
      )
    })

    expect(isCorrectlySorted).toBeTruthy()
  })
})
