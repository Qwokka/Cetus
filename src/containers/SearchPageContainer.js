import React from 'react'
import { connect } from 'react-redux'

import {
  // Actions
  searchAction,
  clearSearchResults,
  // Getters/Selectors
  searchResultsGetter,
  resultsCounterGetter,
  isLoadingGetter,
  isResultsVisibleGetter,
  formDataGetter,
} from '~/store/search/searchPageReducer'

import {
  // Actions
  addBookmark,
  removeBookmark,
  fetchBookmarks,
  // Getters/Selectors
  bookmarksIndexesGetter,
} from '~/store/bookmarks/bookmarksReducer'

import { isPopupGetter } from '~/store/extension/extensionReducer'

import SearchPage from '~/pages/SearchPage'

const mapStateToProps = (state) => ({
  searchResults: searchResultsGetter(state),
  count: resultsCounterGetter(state),
  isLoading: isLoadingGetter(state),
  isResultsVisible: isResultsVisibleGetter(state),
  formData: formDataGetter(state),
  bookmarks: bookmarksIndexesGetter(state),
  isPopup: isPopupGetter(state),
})

const mapDispatchToProps = {
  searchAction,
  clearSearchResults,
  addBookmark,
  removeBookmark,
  fetchBookmarks,
}

export default connect(mapStateToProps, mapDispatchToProps)(SearchPage)
