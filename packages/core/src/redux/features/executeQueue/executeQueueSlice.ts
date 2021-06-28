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
      // TODO: Do we have to check for something (like an item in
      // queue with the same `payload.method`?) before adding the
      // payload to the queue?
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
