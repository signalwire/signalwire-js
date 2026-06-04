import { buildRPCRequest, makeRPCResponse } from './helpers';

import type { VertoMethod } from '../types/rpc.types';
import type { JSONRPCSuccessResponse } from './types/base';
import type { WebrtcVertoParams, WebrtcVertoRequest } from './types/methods';
import type { VertoByeCause } from './types/verto';

type VertoParams = Record<string, unknown>;

const SDK_TO_VERTO_FIELD_MAP: Record<string, string> = {
  id: 'callID',
  destinationNumber: 'destination_number',
  remoteCallerName: 'remote_caller_id_name',
  remoteCallerNumber: 'remote_caller_id_number',
  callerName: 'caller_id_name',
  callerNumber: 'caller_id_number',
  fromCallAddressId: 'from_fabric_address_id'
};

const EXCLUDED_DIALOG_PARAMS = new Set(['remoteSdp', 'localStream', 'remoteStream']);

/**
 * Translate SDK fields into verto variables.
 * Returns a new object — the input is never mutated.
 */
/** @internal Exported for testing only. */
export const filterVertoParams = (params: VertoParams): VertoParams => {
  if (!Object.prototype.hasOwnProperty.call(params, 'dialogParams')) {
    return params;
  }

  const sourceDialogParams = params.dialogParams as Record<string, unknown>;

  const filteredDialogParams = Object.entries(sourceDialogParams).reduce<Record<string, unknown>>(
    (acc, [key, value]) => {
      if (EXCLUDED_DIALOG_PARAMS.has(key)) {
        return acc;
      }
      const mappedKey = SDK_TO_VERTO_FIELD_MAP[key] ?? key;
      return { ...acc, [mappedKey]: value };
    },
    {}
  );

  return {
    ...params,
    dialogParams: filteredDialogParams
  };
};

const buildVertoRPCMessage = (method: VertoMethod) => {
  return (params: VertoParams = {}) => {
    return buildRPCRequest({
      method,
      params: filterVertoParams(params)
    });
  };
};

export type VertoRPCMessage = ReturnType<ReturnType<typeof buildVertoRPCMessage>>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type JSONRPCParams = Record<string, any>;

export const WebrtcVerto = (params: WebrtcVertoParams): WebrtcVertoRequest => {
  return buildRPCRequest({
    method: 'webrtc.verto',
    params
  });
};

export type WebrtcVertoRPCMessage = ReturnType<ReturnType<typeof buildVertoRPCMessage>>;

export const VertoInvite = buildVertoRPCMessage('verto.invite');
export const VertoBye = buildVertoRPCMessage('verto.bye');
export const VertoAttach = buildVertoRPCMessage('verto.attach');
export const VertoModify = buildVertoRPCMessage('verto.modify');
export const VertoInfo = buildVertoRPCMessage('verto.info');
export const VertoAnswer = buildVertoRPCMessage('verto.answer');
export const VertoSubscribe = buildVertoRPCMessage('verto.subscribe');
export const VertoPong = buildVertoRPCMessage('verto.pong');
export const VertoResult = (id: string, method: VertoMethod): JSONRPCSuccessResponse => {
  return makeRPCResponse({
    id,
    result: {
      method
    }
  });
};

export interface VertoModifyResponse {
  action: string;
  callID: string;
  holdState: 'held' | 'active';

  node_id?: string;
  sdp?: string;
}

export const VertoByeCauseCodes: Record<VertoByeCause, string> = {
  NORMAL_CLEARING: '16',

  USER_BUSY: '17',

  MEDIA_TIMEOUT: '804'
} as const;
