import type { PayloadAction, AnyAction } from '../../toolkit'
import type { SessionState } from '../../interfaces'
import type {
  Authorization,
  RPCConnectResult,
  SessionAuthError,
  SessionAuthStatus,
} from '../../../utils/interfaces'
import type { DeepReadonly, SwAuthorizationState } from '../../../types'
import { createDestroyableSlice } from '../../utils/createDestroyableSlice'
import { authErrorAction, initAction, reauthAction } from '../../actions'

export const initialSessionState: DeepReadonly<SessionState> = {
  protocol: '',
  iceServers: [],
  authStatus: 'unknown',
  authorization: undefined,
  authorizationState: undefined,
  authError: undefined,
  authCount: 0,
}

type AuthorizingAction = typeof initAction | typeof reauthAction
function authorizingAction(action: AnyAction): action is AuthorizingAction {
  return [initAction.type, reauthAction.type].includes(action.type)
}

const sessionSlice = createDestroyableSlice({
  name: 'session',
  initialState: initialSessionState,
  reducers: {
    connected: (state, { payload }: PayloadAction<RPCConnectResult>) => {
      return {
        ...state,
        authStatus: 'authorized',
        authorization: payload?.authorization,
        authCount: state.authCount + 1,
        protocol: payload?.protocol ?? '',
        iceServers: payload?.ice_servers ?? [],
      }
    },
    authStatus: (state, { payload }: PayloadAction<SessionAuthStatus>) => {
      return {
        ...state,
        authStatus: payload,
      }
    },
    updateAuthorization: (state, { payload }: PayloadAction<Authorization>) => {
      return {
        ...state,
        authorization: payload,
      }
    },
    updateAuthorizationState: (
      state,
      { payload }: PayloadAction<SwAuthorizationState>
    ) => {
      return {
        ...state,
        authorizationState: payload,
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(
      authErrorAction.type,
      (state, { payload }: PayloadAction<{ error: SessionAuthError }>) => {
        return {
          ...state,
          authStatus: 'unauthorized',
          authError: payload.error,
        }
      }
    )
    builder.addMatcher(authorizingAction, (state) => {
      return {
        ...state,
        authStatus: 'authorizing',
      }
    })
  },
})

// prettier-ignore
export const {
  actions: sessionActions,
  reducer: sessionReducer
} = sessionSlice
