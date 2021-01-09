import typeToReducer from 'type-to-reducer'

import { formatValue } from '~/utils/helpers'

import { FLAG_FREEZE, FLAG_WATCH_READ, FLAG_WATCH_WRITE } from '~/utils/vars'

// action types
export const BOOKMARKS_FETCH = 'bookmarks/fetch'
export const BOOKMARKS_ADD = 'bookmarks/add'
export const BOOKMARKS_REMOVE = 'bookmarks/remove'
export const BOOKMARKS_UPDATE_SUCCEED = 'bookmarks/updateSucceed'
export const BOOKMARKS_UPDATE_FAILED = 'bookmarks/updateFailed'

const DefaultProps = {
  items: [],
  isLoading: false,
}

// getters / selectors
export const bookmarksIndexesGetter = (state) => state.bookmarks.items.map((b) => b.index)
export const bookmarksGetter = (state) => state.bookmarks.items

// reducers
export default typeToReducer(
  {
    [BOOKMARKS_ADD]: (state, _) => {
      return {
        ...state,
        isLoading: true,
      }
    },
    [BOOKMARKS_REMOVE]: (state) => ({
      ...state,
      isLoading: true,
    }),
    [BOOKMARKS_UPDATE_SUCCEED]: (state, { payload }) => {
      return {
        ...state,
        isLoading: false,
        items: formatBookmarks(payload),
      }
    },
  },
  DefaultProps
)

// actions
export const addBookmark = (address, type) => ({
  type: BOOKMARKS_ADD,
  payload: { address, type },
})

export const removeBookmark = (address) => ({
  type: BOOKMARKS_REMOVE,
  payload: { address },
})

export const updateBookmark = (payload) => ({
  type: BOOKMARKS_UPDATE_SUCCEED,
  payload,
})

export const fetchBookmarks = () => ({
  type: BOOKMARKS_FETCH,
})

// data formatters
export const formatBookmarks = (bookmarks) => {
  return Object.keys(bookmarks).map((i) => ({
    index: i,
    data: formatBookmarkData(bookmarks[i]),
  }))
}

export const formatBookmarkData = (bookmark) => {
  return {
    frozen: Boolean(bookmark.flags & FLAG_FREEZE),
    readWatch: Boolean(bookmark.flags & FLAG_WATCH_READ),
    writeWatch: Boolean(bookmark.flags & FLAG_WATCH_WRITE),
    value: formatValue(bookmark.value, bookmark.memType),
    memType: bookmark.memType,
  }
}
