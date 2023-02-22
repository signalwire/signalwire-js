import { createDestroyableSlice } from '../../utils/createDestroyableSlice'
import type { PayloadAction } from '../../toolkit'
import type { ComponentState, ReduxComponent } from '../../interfaces'
import type { DeepReadonly } from '../../../types'

export const initialComponentState: DeepReadonly<ComponentState> = {
  byId: {},
}

type UpdateComponent = Partial<ReduxComponent> & Pick<ReduxComponent, 'id'>
type CleanupComponentParams = {
  ids: Array<ReduxComponent['id']>
}

const componentSlice = createDestroyableSlice({
  name: 'components',
  initialState: initialComponentState,
  reducers: {
    upsert: (state, { payload }: PayloadAction<UpdateComponent>) => {
      if (payload.id in state.byId) {
        return {
          ...state,
          byId: {
            ...state.byId,
            [payload.id]: {
              ...state.byId[payload.id],
              ...payload,
            },
          },
        }
      } else {
        return {
          ...state,
          byId: {
            ...state.byId,
            [payload.id]: payload,
          },
        }
      }
    },
    cleanup: (state, { payload }: PayloadAction<CleanupComponentParams>) => {
      return {
        ...state,
        byId: Object.entries(state.byId).reduce(
          (reducer, [componentId, value]) => {
            if (!payload.ids.includes(componentId)) {
              reducer[componentId] = value
            }

            return reducer
          },
          {} as ComponentState['byId']
        ),
      }
    },
  },
})

// prettier-ignore
export const {
  actions: componentActions,
  reducer: componentReducer
} = componentSlice
