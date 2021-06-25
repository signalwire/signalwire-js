import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { ExecuteQueueState, ExecuteActionParams } from '../../interfaces'
import { destroyAction } from '../../actions'

export const initialExecuteQueueState: Readonly<ExecuteQueueState> = {
  queue: [],
}

const executeQueueSlice = createSlice({
  name: 'executeQueue',
  initialState: initialExecuteQueueState,
  reducers: {
    add: (state, { payload }: PayloadAction<ExecuteActionParams>) => {
      state.queue.push(payload)
    },
    clean: () => {
      return initialExecuteQueueState
    },
  },
  extraReducers: (builder) => {
    builder.addCase(destroyAction.type, () => {
      return initialExecuteQueueState
    })
  },
})

// prettier-ignore
export const {
  actions: executeQueueActions,
  reducer: executeQueueReducer
} = executeQueueSlice
