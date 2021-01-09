import typeToReducer from 'type-to-reducer'

// action types
export const SPEEDHACK_UPDATE = 'speedhack/update'
export const SPEEDHACK_UPDATE_SUCCEED = 'speedhack/updateSucceed'
export const SPEEDHACK_TOGGLE = 'speedhack/toggle'

// default state
const DefaultProps = {
  speedhack: {
    enabled: false,
    multiplier: 2,
  },
  isLoading: false,
  multiplier: null,
}

// getters / selectors
export const speedhackGetter = (state) => state.speedhack.speedhack
export const multiplierGetter = (state) => state.speedhack.speedhack.multiplier

// reducers
export default typeToReducer(
  {
    [SPEEDHACK_UPDATE_SUCCEED]: (state, { speedhack }) => ({
      ...state,
      speedhack,
      isLoading: false,
    }),
    [SPEEDHACK_TOGGLE]: (state, { multiplier }) => ({
      ...state,
      multiplier,
      speedhack: {
        multiplier,
        enabled: !state.speedhack.enabled,
      },
      isLoading: true,
    }),
  },
  DefaultProps
)

// actions
export const updateSpeedhackSucceed = (speedhack) => ({
  type: SPEEDHACK_UPDATE_SUCCEED,
  speedhack,
})

export const toggleSpeedhack = (multiplier) => ({
  type: SPEEDHACK_TOGGLE,
  multiplier,
})
