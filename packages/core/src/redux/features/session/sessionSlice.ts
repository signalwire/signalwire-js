import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { SessionState } from '../../interfaces'
import { IBladeConnectResult } from '../../../utils/interfaces'
import { destroyAction } from '../../actions'

export const initialSessionState: Readonly<SessionState> = {
  protocol: '',
  iceServers: [],
}

const sessionSlice = createSlice({
  name: 'session',
  initialState: initialSessionState,
  reducers: {
    connected: (state, { payload }: PayloadAction<IBladeConnectResult>) => {
      state.protocol = payload?.result?.protocol ?? ''
      state.iceServers = payload?.result?.iceServers ?? []
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
