import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';

const mockCallStateConnect = vi.fn();
const mockCallStateDisconnect = vi.fn();

vi.mock('../context/CallStateContextController.js', () => ({
  CallStateContextController: vi.fn().mockImplementation(() => ({
    connect: mockCallStateConnect,
    disconnect: mockCallStateDisconnect,
    hostConnected: vi.fn(),
    hostDisconnected: vi.fn(),
    hostUpdated: vi.fn(),
  })),
}));

const mockDevicesConnectCall = vi.fn();
const mockDevicesDisconnectCall = vi.fn();
const mockDevicesConnectDevices = vi.fn();
const mockDevicesDisconnect = vi.fn();

vi.mock('../context/DevicesContextController.js', () => ({
  DevicesContextController: vi.fn().mockImplementation(() => ({
    connectCall: mockDevicesConnectCall,
    disconnectCall: mockDevicesDisconnectCall,
    connectDevices: mockDevicesConnectDevices,
    disconnect: mockDevicesDisconnect,
    hostConnected: vi.fn(),
    hostDisconnected: vi.fn(),
    hostUpdated: vi.fn(),
  })),
}));

import './sw-call-provider.js';
import type { SwCallProvider } from './sw-call-provider.js';

function makeCall() {
  return { id: 'c1' } as any;
}

function makeDeviceController() {
  return { id: 'dc1' } as any;
}

async function mount(props: Partial<SwCallProvider> = {}): Promise<SwCallProvider> {
  const el = document.createElement('sw-call-provider') as SwCallProvider;
  Object.assign(el, props);
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

describe('sw-call-provider', () => {
  let el: SwCallProvider | null = null;

  beforeEach(() => {
    mockCallStateConnect.mockClear();
    mockCallStateDisconnect.mockClear();
    mockDevicesConnectCall.mockClear();
    mockDevicesDisconnectCall.mockClear();
    mockDevicesConnectDevices.mockClear();
    mockDevicesDisconnect.mockClear();
  });

  afterEach(() => { el?.remove(); el = null; });

  it('renders a slot', async () => {
    el = await mount();
    expect(el.shadowRoot!.querySelector('slot')).toBeTruthy();
  });

  it('calls callState.connect and devices.connectCall when call prop is set', async () => {
    const call = makeCall();
    el = await mount({ call });
    expect(mockCallStateConnect).toHaveBeenCalledWith(call);
    expect(mockDevicesConnectCall).toHaveBeenCalledWith(call);
  });

  it('calls callState.disconnect and devices.disconnectCall when call prop is cleared', async () => {
    const call = makeCall();
    el = await mount({ call });
    mockCallStateDisconnect.mockClear();
    mockDevicesDisconnectCall.mockClear();
    el.call = undefined;
    await el.updateComplete;
    expect(mockCallStateDisconnect).toHaveBeenCalled();
    expect(mockDevicesDisconnectCall).toHaveBeenCalled();
  });

  it('calls devices.connectDevices when deviceController prop is set', async () => {
    const dc = makeDeviceController();
    el = await mount({ deviceController: dc });
    expect(mockDevicesConnectDevices).toHaveBeenCalledWith(dc);
  });

  it('calls callState.disconnect and devices.disconnect on disconnectedCallback', async () => {
    el = await mount({ call: makeCall() });
    mockCallStateDisconnect.mockClear();
    mockDevicesDisconnect.mockClear();
    el.remove();
    expect(mockCallStateDisconnect).toHaveBeenCalled();
    expect(mockDevicesDisconnect).toHaveBeenCalled();
    el = null;
  });

  it('reconnects when call prop changes to a new call', async () => {
    const call1 = makeCall();
    const call2 = { id: 'c2' } as any;
    el = await mount({ call: call1 });
    mockCallStateConnect.mockClear();
    mockDevicesConnectCall.mockClear();
    el.call = call2;
    await el.updateComplete;
    expect(mockCallStateConnect).toHaveBeenCalledWith(call2);
    expect(mockDevicesConnectCall).toHaveBeenCalledWith(call2);
  });
});
