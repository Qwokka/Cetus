import typeToReducer from 'type-to-reducer'

// action types
export const WATCHPOINT_FREEZE_UPDATE = 'watchpoints/freezeUpdate'
export const WATCHPOINT_FREEZE_UPDATE_SUCCEED = 'watchpoints/freezeUpdateSucceed'

export const WATCHPOINT_READ_UPDATE = 'watchpoints/readUpdate'
export const WATCHPOINT_READ_UPDATE_SUCCEED = 'watchpoints/readUpdateSucceed'

export const WATCHPOINT_WRITE_UPDATE = 'watchpoints/writeUpdate'
export const WATCHPOINT_WRITE_UPDATE_SUCCEED = 'watchpoints/writeUpdateSucceed'

export const WATCHPOINT_MEMORY_UPDATE = 'watchpoints/memoryUpdate'

const DefaultProps = {
  isLoading: false,
}

// reducers
export default typeToReducer(
  {
    [WATCHPOINT_FREEZE_UPDATE]: (state) => ({
      ...state,
      isLoading: true,
    }),
    [WATCHPOINT_FREEZE_UPDATE_SUCCEED]: (state, payload) => {
      return {
        ...state,
        isLoading: false,
      }
    },
  },
  DefaultProps
)

// actions
export const updateFreeze = (address, value) => ({
  type: WATCHPOINT_FREEZE_UPDATE,
  payload: { address, value },
})

export const updateReadWatch = (address, value) => ({
  type: WATCHPOINT_READ_UPDATE,
  payload: { address, value },
})

export const updateWriteWatch = (address, value) => ({
  type: WATCHPOINT_WRITE_UPDATE,
  payload: { address, value },
})

export const updateMemory = (address, value, type) => ({
  type: WATCHPOINT_MEMORY_UPDATE,
  payload: { address, value, type },
})
