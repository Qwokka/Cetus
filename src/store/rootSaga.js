import { takeEvery, all } from 'redux-saga/effects'

// sagas
import { searchSaga, updateSearchFormSaga, clearResultsSaga } from '~/store/search/searchSaga'

import { 
  initBgChannelSaga, 
  postBgMessageSaga,
} from '~/store/extension/extensionSaga'

import {
  saveBookmarkSaga,
  removeBookmarkSaga,
  fetchBookmarksSaga,
} from '~/store/bookmarks/bookmarksSaga'

import {
  updateFreezeWatchpointSaga,
  updateBookmarkValueSaga,
  updateReadWatchpointSaga,
  updateWriteWatchpointSaga,
} from '~/store/watchpoints/watchpointsSaga'

import { toggleSpeedHackSaga } from '~/store/speedhack/speedhackSaga'

import {
  savePatchSaga,
  updatePatchesSaga,
  searchFunctionSaga,
} from '~/store/patches/patchesSaga'

// action types
import {
  SEARCH_PAGE_SEARCH,
  SEARCH_PAGE_UPDATE_FORM,
  SEARCH_PAGE_CLEAR_RESULTS,
} from '~/store/search/searchPageReducer'

import { 
  EXTENSION_INIT_BGCHANNEL,
  EXTENSION_POST,
} from '~/store/extension/extensionReducer'

import {
  PATCH_SAVE,
  PATCHES_UPDATE,
  PATCHES_SEARCH,
} from '~/store/patches/patchesReducer'

import {
  BOOKMARKS_ADD,
  BOOKMARKS_REMOVE,
  BOOKMARKS_FETCH,
} from '~/store/bookmarks/bookmarksReducer'

import {
  WATCHPOINT_FREEZE_UPDATE,
  WATCHPOINT_MEMORY_UPDATE,
  WATCHPOINT_READ_UPDATE,
  WATCHPOINT_WRITE_UPDATE,
} from '~/store/watchpoints/watchpointsReducer'

import { SPEEDHACK_TOGGLE } from '~/store/speedhack/speedhackReducer'

export default function* mainSaga() {
  yield all([
    takeEvery(EXTENSION_INIT_BGCHANNEL, initBgChannelSaga),
    takeEvery(EXTENSION_POST, postBgMessageSaga),

    takeEvery(SEARCH_PAGE_SEARCH, searchSaga),
    takeEvery(SEARCH_PAGE_UPDATE_FORM, updateSearchFormSaga),
    takeEvery(SEARCH_PAGE_CLEAR_RESULTS, clearResultsSaga),

    takeEvery(BOOKMARKS_ADD, saveBookmarkSaga),
    takeEvery(BOOKMARKS_REMOVE, removeBookmarkSaga),
    takeEvery(BOOKMARKS_FETCH, fetchBookmarksSaga),

    takeEvery(WATCHPOINT_FREEZE_UPDATE, updateFreezeWatchpointSaga),
    takeEvery(WATCHPOINT_MEMORY_UPDATE, updateBookmarkValueSaga),
    takeEvery(WATCHPOINT_READ_UPDATE, updateReadWatchpointSaga),
    takeEvery(WATCHPOINT_WRITE_UPDATE, updateWriteWatchpointSaga),

    takeEvery(SPEEDHACK_TOGGLE, toggleSpeedHackSaga),

    takeEvery(PATCH_SAVE, savePatchSaga),
    takeEvery(PATCHES_UPDATE, updatePatchesSaga),
    takeEvery(PATCHES_SEARCH, searchFunctionSaga)
  ])
}
