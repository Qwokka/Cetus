import { connect } from 'react-redux'

import {
  // Actions
  addBookmark,
  removeBookmark,
  fetchBookmarks,
  // Getters/Selectors
  bookmarksGetter,
} from '~/store/bookmarks/bookmarksReducer'

import {
  // Actions
  updateFreeze,
  updateMemory,
  updateReadWatch,
  updateWriteWatch,
} from '~/store/watchpoints/watchpointsReducer'

import { formDataGetter } from '~/store/search/searchPageReducer'

import { isPopupGetter } from '~/store/extension/extensionReducer'

import BookmarksPage from '~/pages/BookmarksPage'

const mapStateToProps = (state) => ({
  bookmarks: bookmarksGetter(state),
  memType: formDataGetter(state).valueType,
  isPopup: isPopupGetter(state),
})

const mapDispatchToProps = {
  addBookmark,
  removeBookmark,
  updateFreeze,
  fetchBookmarks,
  updateMemory,
  updateReadWatch,
  updateWriteWatch,
}

export default connect(mapStateToProps, mapDispatchToProps)(BookmarksPage)
