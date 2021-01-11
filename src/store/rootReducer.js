import { combineReducers } from 'redux'

import theme from '~/store/utils/themeReducer'
import router from '~/store/router/routerReducer'
import searchPage from '~/store/search/searchPageReducer'
import bookmarks from '~/store/bookmarks/bookmarksReducer'
import extension from '~/store/extension/extensionReducer'
import watchpoints from '~/store/watchpoints/watchpointsReducer'
import speedhack from '~/store/speedhack/speedhackReducer'
import patches from '~/store/patches/patchesReducer'

const rootReducer = combineReducers({
  theme,
  router,
  bookmarks,
  searchPage,
  extension,
  watchpoints,
  speedhack,
  patches,
})

export default rootReducer
