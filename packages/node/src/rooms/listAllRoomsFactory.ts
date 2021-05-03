import { HttpClient, ListAllRoomsResponse } from '../types'

interface ListAllRoomsOptions {
  startsAfter?: string
  startsBefore?: string
  pageNumber?: number
  pageToken?: string
  pageSize?: number
}

export type ListAllRooms = (
  options?: ListAllRoomsOptions
) => Promise<ListAllRoomsResponse>

type ListAllRoomsFactory = (client: HttpClient) => ListAllRooms

export const listAllRoomsFactory: ListAllRoomsFactory = (client) => async (
  options = {}
) => {
  const {
    startsAfter: starts_at,
    startsBefore: starts_before,
    pageNumber: page_number,
    pageToken: page_token,
    pageSize: page_size,
  } = options
  const { body } = await client.get<ListAllRoomsResponse>('video/rooms', {
    searchParams: {
      starts_at,
      starts_before,
      page_number,
      page_token,
      page_size,
    },
    responseType: 'json',
  })

  return body
}
