import type { PayloadAction } from '../../core'
import { ExecuteQueueState, ExecuteActionParams } from '../../interfaces'
import { createDestroyableSlice } from '../../utils/createDestroyableSlice'

export const initialExecuteQueueState: Readonly<ExecuteQueueState> = {
  queue: [],
}

const executeQueueSlice = createDestroyableSlice({
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
})

// prettier-ignore
export const {
  actions: executeQueueActions,
  reducer: executeQueueReducer
} = executeQueueSlice
