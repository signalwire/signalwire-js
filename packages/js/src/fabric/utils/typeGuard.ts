import {
  GetAddressParams,
  GetAddressByNameParams,
  GetAddressByIdParams,
  GetAddressResponse,
  GetAddressesResponse,
} from '../types'

export const isGetAddressByNameParams = (
  obj: GetAddressParams
): obj is GetAddressByNameParams => {
  return obj && 'name' in obj
}

export const isGetAddressByIdParams = (
  obj: GetAddressParams
): obj is GetAddressByIdParams => {
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
  return obj && 'data' in obj
}
