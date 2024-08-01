import {
  GetAddressParams,
  GetAddressBySafeNameParam,
  GetAddressByIdParam,
  GetAddressResponse,
  GetAddressesResponse,
} from '../types'

export const isGetAddressBySafeNameParam = (
  obj: GetAddressParams
): obj is GetAddressBySafeNameParam => {
  return obj && 'name' in obj
}

export const isGetAddressByIdParam = (
  obj: GetAddressParams
): obj is GetAddressByIdParam => {
  return obj && 'id' in obj
}

export const isGetAddressResponse = (
  obj: GetAddressResponse | GetAddressesResponse
): obj is GetAddressResponse => {
  return obj && 'id' in obj && 'name' in obj
}

export const isGetAddressesResponse = (
  obj: GetAddressResponse | GetAddressesResponse
): obj is GetAddressesResponse => {
  return obj && 'id' in obj && 'name' in obj
}
