import { put, select } from 'redux-saga/effects'

import {
  // actions
  savePatchSucceed,
  savePatchFailed,
  updatePatches,

  searchFunctionFailed,
  // getters
  patchesGetter,
} from '~/store/patches/patchesReducer'

import { postBgMessage } from '~/store/extension/extensionReducer'

export function* savePatchSaga({ patch }) {
  try {
    const newPatch = {
      name: patch.name,
      index: patch.index,
      bytes: patch.bytes,
      url: patch.url,
      enabled: true,
    }

    yield put(savePatchSucceed(newPatch))
    yield put(updatePatches())
    
  } catch (error) {
    yield put(savePatchFailed(error))
  }
}

export function* updatePatchesSaga() {
  try {
    const newPatches = yield select(patchesGetter)
    console.log(newPatches)
    // TODO: firefox support
    chrome.storage.local.set({ savedPatches: newPatches })
  } catch (error) {
    yield put(updatePatchesFailed(error))
  }
}

export function* searchFunctionSaga({ index }) {
  try {
    const msg = {
      type: 'queryFunction',
      body: { index }
    }
    yield put(postBgMessage(msg))
  } catch (error) {
    yield put(searchFunctionFailed(error))
  }
}