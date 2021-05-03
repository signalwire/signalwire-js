import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { SessionState } from '../../interfaces'
import {
  IBladeConnectResult,
  SessionAuthError,
} from '../../../utils/interfaces'
import { destroyAction } from '../../actions'

export const initialSessionState: Readonly<SessionState> = {
  protocol: '',
  iceServers: [],
  authStatus: 'unknown',
  authError: undefined,
}

const sessionSlice = createSlice({
  name: 'session',
  initialState: initialSessionState,
  reducers: {
    connected: (state, { payload }: PayloadAction<IBladeConnectResult>) => {
      state.authStatus = 'authorized'
      state.protocol = payload?.result?.protocol ?? ''
      state.iceServers = payload?.result?.iceServers ?? []
    },
    authError: (
      state,
      { payload }: PayloadAction<{ authError: SessionAuthError }>
    ) => {
      state.authStatus = 'unauthorized'
      state.authError = payload.authError
    },
  },
  extraReducers: (builder) => {
    builder.addCase(destroyAction.type, () => {
      return initialSessionState
    })
  },
})

// prettier-ignore
export const {
  actions: sessionActions,
  reducer: sessionReducer
} = sessionSlice
