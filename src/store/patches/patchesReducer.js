import typeToReducer from 'type-to-reducer'

export const PATCH_SAVE = 'patches/patchSave'
export const PATCH_SAVE_SUCCEED = 'patches/patchSaveSucceed'
export const PATCH_SAVE_FAILED = 'patches/patchSaveFailed'
export const PATCHES_UPDATE = 'patches/pathesUpdate'

export const PATCHES_SEARCH = 'patches/search'
export const PATCHES_SEARCH_SUCCEED = 'patches/searchSucceed'
export const PATCHES_SEARCH_FAILED = 'patches/searchFailed'

// default state
const DefaultProps = {
  items: [],
  searchResult: {},
}

// getters / selectors
export const patchesGetter = state => state.patches.items
export const searchResultGetter = state => state.patches.searchResult

// reducers
export default typeToReducer(
  {
    [PATCH_SAVE_SUCCEED]: (state, { patch }) => ({
      ...state,
      items: [...state.items, patch],
    }),
    [PATCHES_SEARCH_SUCCEED]: (state, { searchResult }) => ({
      ...state,
      searchResult
    })
  },
  DefaultProps
)

export const savePatch = (patch) => ({
  type: PATCH_SAVE,
  patch
})

export const savePatchSucceed = (patch) => ({
  type: PATCH_SAVE_SUCCEED,
  patch,
})

export const savePatchFailed = (error) => ({
  type: PATCH_SAVE_FAILED,
  error,
})

export const updatePatches = () => ({
  type: PATCHES_UPDATE,
})

export const searchFunction = (index) => ({
  type: PATCHES_SEARCH,
  index,
})

export const searchFunctionFailed = (error) => ({
  type: PATCHES_SEARCH_FAILED,
  error,
})

export const searchFunctionSucceed = (searchResult) => ({
  type: PATCHES_SEARCH_SUCCEED,
  searchResult,
})