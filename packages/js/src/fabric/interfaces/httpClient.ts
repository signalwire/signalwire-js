import { GetSubscriberInfoResult } from '.'
import {
  GetAddressesParams,
  GetAddressesResult,
  GetAddressParams,
  GetAddressResult,
} from './address'
import {
  RegisterDeviceParams,
  RegisterDeviceResult,
  UnregisterDeviceParams,
} from './device'

export interface HTTPClientContract {
  /**
   * Retrieve a resource by its ID or Name.
   *
   * @param params - The parameters for fetching the resource {@link GetAddressParams}.
   * @returns A promise that resolves to the resource {@link GetAddressResult}.
   */
  getAddress(params: GetAddressParams): Promise<GetAddressResult>
  /**
   * Retrieve all resources defined in your SignalWire dashboard.
   * Supports optional resource filtering.
   *
   * @param params - The parameters for filtering resources {@link GetAddressesParams}.
   * @returns A promise that resolves to the list of resources {@link GetAddressesResult}.
   */
  getAddresses(params?: GetAddressesParams): Promise<GetAddressesResult>
  /**
   * Register a device to receive incoming call requests.
   *
   * @param params - The parameters required to register the device {@link RegisterDeviceParams}.
   * @returns A promise that resolves to the registration result {@link RegisterDeviceResult}.
   */
  registerDevice(params: RegisterDeviceParams): Promise<RegisterDeviceResult>
  /**
   * Unregister a device to stop receiving incoming call requests.
   *
   * @param params - The parameters required to unregister the device {@link UnregisterDeviceParams}.
   * @returns A promise that resolves when the device is successfully unregistered.
   */
  unregisterDevice(params: UnregisterDeviceParams): Promise<void>
  /**
   * Retrieve information about the current subscriber.
   *
   * @returns A promise that resolves to the subscriber information object {@link GetSubscriberInfoResult}.
   */
  getSubscriberInfo(): Promise<GetSubscriberInfoResult>
}
