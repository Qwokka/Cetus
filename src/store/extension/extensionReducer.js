import typeToReducer from 'type-to-reducer'

export const EXTENSION_INIT_BGCHANNEL = 'extension/initBackgroundChannel'
export const EXTENSION_INIT_BGCHANNEL_SUCCEED = 'extension/initBackgroundChannelSucceed'
export const EXTENSION_INIT_BGCHANNEL_FAILED = 'extension/initBackgroundChannelFailed'

export const EXTENSION_POST = 'extension/post'
export const EXTENSION_POST_FAILED = 'extension/postFailed'

export const EXTENSION_UPDATE = 'extension/updateValues'

export const EXTENSION_STACKTRACE_UPDATE = 'extension/updateStackTrace'

export const EXTENSION_SPEEDHACK_UPDATE = 'extension/updateSpeedhack'

export const EXTENSION_VIEW_MODE_UPDATE = 'extension/updateViewMode'

// default state
const DefaultProps = {
  url: null,
  searchMemType: 'i32',

  bgChannel: null,
  isBgChannelError: false,

  isLoading: false,
  isPopup: true,

  stacktraces: [],
  symbols: {},
  speedhack: {},
}

// getters / selectors
export const bgChannelGetter = (state) => state.extension.bgChannel
export const isPopupGetter = (state) => state.extension.isPopup

// reducers
export default typeToReducer(
  {
    [EXTENSION_INIT_BGCHANNEL]: (state) => ({
      ...state,
      isLoading: true,
    }),
    [EXTENSION_INIT_BGCHANNEL_SUCCEED]: (state, { bgChannel }) => ({
      // called by initBgChannelSaga
      ...state,
      bgChannel,
      isLoading: false,
      isBgChannelError: false,
    }),
    [EXTENSION_INIT_BGCHANNEL_FAILED]: (state) => ({
      ...DefaultProps,
      isBgChannelError: true,
      isLoading: false,
    }),
    [EXTENSION_UPDATE]: (state, { payload }) => ({
      ...state,
      ...payload,
    }),
    [EXTENSION_STACKTRACE_UPDATE]: (state, { stacktraces }) => ({
      ...state,
      stacktraces,
    }),
    [EXTENSION_SPEEDHACK_UPDATE]: (state, { speedhack }) => ({
      ...state,
      speedhack,
    }),
    [EXTENSION_VIEW_MODE_UPDATE]: (state, { isPopup }) => ({
      ...state,
      isPopup,
    }),
  },
  DefaultProps
)

// actions
export const initBgChannel = () => ({
  type: EXTENSION_INIT_BGCHANNEL,
})

export const postBgMessage = (msg) => ({
  type: EXTENSION_POST,
  msg,
})

export const updateExtensionValues = (payload) => ({
  type: EXTENSION_UPDATE,
  payload,
})

export const initBgChannelSucceed = (bgChannel) => ({
  type: EXTENSION_INIT_BGCHANNEL_SUCCEED,
  bgChannel,
})

export const updateStackTraceSucceed = (payload) => ({
  type: EXTENSION_STACKTRACE_UPDATE,
  stacktraces: payload.stackTrace,
})

export const updateSpeedhackSucceed = (speedhack) => ({
  type: EXTENSION_SPEEDHACK_UPDATE,
  speedhack,
})

export const setIsPopup = (isPopup) => ({
  type: EXTENSION_VIEW_MODE_UPDATE,
  isPopup,
})
