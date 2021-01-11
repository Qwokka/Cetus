import { put } from 'redux-saga/effects'

import { FLAG_FREEZE, FLAG_WATCH_READ, FLAG_WATCH_WRITE } from '~/utils/vars'

import { postBgMessage } from '~/store/extension/extensionReducer'

import { fetchBookmarks } from '~/store/bookmarks/bookmarksReducer'

export function* updateFreezeWatchpointSaga({ payload }) {
  console.log('freeze saga', payload)
  try {
    yield put(
      postBgMessage({
        type: 'updateWatchpoint',
        body: {
          memAddr: payload.address,
          memValue: payload.value,
          flags: FLAG_FREEZE,
        },
      })
    )
  } catch (error) {
    console.log('SAGA updateFreezeWatchpointSaga ERROR: postBgMessage', error)
    // yield put({ type: EXTENSION_POST_FAILED })
  }
}

export function* updateReadWatchpointSaga({ payload }) {
  try {
    yield put(
      postBgMessage({
        type: 'updateWatchpoint',
        body: {
          memAddr: payload.address,
          memValue: payload.value,
          flags: FLAG_WATCH_READ,
        },
      })
    )
  } catch (error) {
    console.log('SAGA updateReadWatchpointSaga ERROR: postBgMessage', error)
    // yield put({ type: EXTENSION_POST_FAILED })
  }
}

export function* updateWriteWatchpointSaga({ payload }) {
  try {
    yield put(
      postBgMessage({
        type: 'updateWatchpoint',
        body: {
          memAddr: payload.address,
          memValue: payload.value,
          flags: FLAG_WATCH_WRITE,
        },
      })
    )
  } catch (error) {
    console.log('SAGA updateWriteWatchpointSaga ERROR: postBgMessage', error)
    // yield put({ type: EXTENSION_POST_FAILED })
  }
}

export function* updateBookmarkValueSaga({ payload }) {
  try {
    yield put(
      postBgMessage({
        type: 'modifyMemory',
        body: {
          memAddr: payload.address,
          memValue: payload.value,
          memType: payload.type,
        },
      })
    )
    yield put(fetchBookmarks())
  } catch (error) {
    console.log('updateBookmarkValueSaga error', error)
  }
}
