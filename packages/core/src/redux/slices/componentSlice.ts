import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { ComponentState, ReduxComponent } from '../interfaces'

export const initialComponentState: Readonly<ComponentState> = {}

type UpdateComponent = Partial<ReduxComponent> & Pick<ReduxComponent, 'id'>

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
  },
})

// prettier-ignore
export const {
  actions: componentActions,
  reducer: componentReducer
} = componentSlice
