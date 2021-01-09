import { put } from 'redux-saga/effects'

import { postBgMessage } from '~/store/extension/extensionReducer'

export function* saveBookmarkSaga({ payload }) {
  try {
    yield put(
      postBgMessage({
        type: 'addBookmark',
        body: {
          memAddr: payload.address,
          memType: payload.type,
        },
      })
    )
  } catch (error) {
    console.log('SAGA save bookmarks ERROR: postBgMessage', error)
    yield put({ type: EXTENSION_POST_FAILED })
  }
}

export function* removeBookmarkSaga({ payload }) {
  try {
    yield put(
      postBgMessage({
        type: 'removeBookmark',
        body: {
          memAddr: payload.address,
        },
      })
    )
  } catch (error) {
    console.log('SAGA removeBookmark error', error)
  }
}

export function* fetchBookmarksSaga() {
  try {
    yield put(
      postBgMessage({
        type: 'getCurrentBookmarks',
      })
    )
  } catch (error) {
    console.log('SAGA fetchBookmarksSaga error', error)
  }
}
