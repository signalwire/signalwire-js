import { VertoMethod } from '../utils/constants'
import { makeRPCRequest } from './helpers'

type VertoParams = { [key: string]: any }

const tmpMap = {
  id: 'callID',
  destinationNumber: 'destination_number',
  remoteCallerName: 'remote_caller_id_name',
  remoteCallerNumber: 'remote_caller_id_number',
  callerName: 'caller_id_name',
  callerNumber: 'caller_id_number',
}

/**
 * Translate SDK fields into verto variables
 */
const filterVertoParams = (params: VertoParams) => {
  if (params.hasOwnProperty('dialogParams')) {
    const {
      remoteSdp,
      localStream,
      remoteStream,
      ...dialogParams
    } = params.dialogParams
    for (const key in tmpMap) {
      if (key && dialogParams.hasOwnProperty(key)) {
        dialogParams[tmpMap[key]] = dialogParams[key]
        delete dialogParams[key]
      }
    }
    params.dialogParams = dialogParams
  }

  return params
}

const buildVertoRPCMessage = (method: VertoMethod) => {
  return (params: VertoParams = {}) => {
    return makeRPCRequest({
      method,
      params: filterVertoParams(params),
    })
  }
}

export const VertoInvite = buildVertoRPCMessage(VertoMethod.Invite)
export const VertoBye = buildVertoRPCMessage(VertoMethod.Bye)
export const VertoAttach = buildVertoRPCMessage(VertoMethod.Attach)
export const VertoModify = buildVertoRPCMessage(VertoMethod.Modify)
export const VertoInfo = buildVertoRPCMessage(VertoMethod.Info)
