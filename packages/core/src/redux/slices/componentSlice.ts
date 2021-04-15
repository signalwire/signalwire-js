import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { JSONRPCResponse } from '../../utils/interfaces'
import { ComponentState, ReduxComponent } from '../interfaces'

export const initialComponentState: Readonly<ComponentState> = {}

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

const componentSlice = createSlice({
  name: 'components',
  initialState: initialComponentState,
  reducers: {
    update: (state, { payload }: PayloadAction<UpdateComponent>) => {
      if (payload.id in state) {
        // To avoid spread operator, update only the keys passed in.
        Object.keys(payload).forEach((key) => {
          // @ts-ignore
          state[payload.id][key] = payload[key]
        })
      } else {
        // If not in state already, set directly using the id.
        state[payload.id] = payload
      }
    },
    executeSuccess: (state, { payload }: PayloadAction<SuccessParams>) => {
      console.debug('executeSuccess', payload)
      const { componentId, requestId, response } = payload
      if (state[componentId]) {
        state[componentId].responses = state[componentId].responses || {}
        state[componentId].responses![requestId] = response
      }
    },
    executeFailure: (state, { payload }: PayloadAction<FailureParams>) => {
      console.debug('executeFailure', payload)
      const { componentId, requestId, error, action } = payload
      if (state[componentId]) {
        state[componentId].errors = state[componentId].errors || {}
        state[componentId].errors![requestId] = {
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
