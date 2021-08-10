import { PayloadAction } from '@reduxjs/toolkit'
import { JSONRPCResponse } from '../../../utils/interfaces'
import { ComponentState, ReduxComponent } from '../../interfaces'
import { createDestroyableSlice } from '../../utils/createDestroyableSlice'

export const initialComponentState: Readonly<ComponentState> = {
  byId: {},
}

type UpdateComponent = Partial<ReduxComponent> & Pick<ReduxComponent, 'id'>

type SuccessParams = {
  componentId: string
  requestId: string
  response: JSONRPCResponse
}
type FailureParams = {
  componentId: string
  requestId: string
  error: JSONRPCResponse
  action: any
}

const componentSlice = createDestroyableSlice({
  name: 'components',
  initialState: initialComponentState,
  reducers: {
    upsert: (state, { payload }: PayloadAction<UpdateComponent>) => {
      if (payload.id in state.byId) {
        // To avoid spread operator, update only the keys passed in.
        Object.keys(payload).forEach((key) => {
          // @ts-ignore
          state.byId[payload.id][key] = payload[key]
        })
      } else {
        // If not in state already, set directly using the id.
        state.byId[payload.id] = payload
      }
    },
    executeSuccess: (state, { payload }: PayloadAction<SuccessParams>) => {
      const { componentId, requestId, response } = payload
      if (state.byId[componentId]) {
        state.byId[componentId].responses =
          state.byId[componentId].responses || {}
        state.byId[componentId].responses![requestId] = response
      }
    },
    executeFailure: (state, { payload }: PayloadAction<FailureParams>) => {
      const { componentId, requestId, error, action } = payload
      if (state.byId[componentId]) {
        state.byId[componentId].errors = state.byId[componentId].errors || {}
        state.byId[componentId].errors![requestId] = {
          action,
          jsonrpc: error,
        }
      }
    },
  },
})

// prettier-ignore
export const {
  actions: componentActions,
  reducer: componentReducer
} = componentSlice
