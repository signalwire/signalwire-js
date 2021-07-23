import { PayloadAction } from '@reduxjs/toolkit'
import { SessionState } from '../../interfaces'
import {
  IBladeConnectResult,
  SessionAuthError,
  SessionAuthStatus,
} from '../../../utils/interfaces'
import { createDestroyableSlice } from '../../utils/createDestroyableSlice'
import { authErrorAction } from '../../actions'

export const initialSessionState: Readonly<SessionState> = {
  protocol: '',
  iceServers: [],
  authStatus: 'unknown',
  authError: undefined,
  authCount: 0,
}

const sessionSlice = createDestroyableSlice({
  name: 'session',
  initialState: initialSessionState,
  reducers: {
    connected: (state, { payload }: PayloadAction<IBladeConnectResult>) => {
      state.authStatus = 'authorized'
      state.authCount += 1
      state.protocol = payload?.protocol ?? ''
      state.iceServers = payload?.ice_servers ?? []
    },
    authStatus: (state, { payload }: PayloadAction<SessionAuthStatus>) => {
      state.authStatus = payload
    },
  },
  extraReducers: (builder) => {
    builder.addCase(
      authErrorAction.type,
      (state, { payload }: PayloadAction<{ error: SessionAuthError }>) => {
        state.authStatus = 'unauthorized'
        state.authError = payload.error
      }
    )
  },
})

// prettier-ignore
export const {
  actions: sessionActions,
  reducer: sessionReducer
} = sessionSlice
