import { PayloadAction } from '@reduxjs/toolkit'
import { SessionState } from '../../interfaces'
import {
  IBladeConnectResult,
  SessionAuthError,
} from '../../../utils/interfaces'
import { authError } from '../../actions'
import { createDestroyableSlice } from '../../utils/createDestroyableSlice'

export const initialSessionState: Readonly<SessionState> = {
  protocol: '',
  iceServers: [],
  authStatus: 'unknown',
  authError: undefined,
}

const sessionSlice = createDestroyableSlice({
  name: 'session',
  initialState: initialSessionState,
  reducers: {
    connected: (state, { payload }: PayloadAction<IBladeConnectResult>) => {
      state.authStatus = 'authorized'
      state.protocol = payload?.result?.protocol ?? ''
      state.iceServers = payload?.result?.iceServers ?? []
    },
  },
  extraReducers: (builder) => {
    builder.addCase(
      authError.type,
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
