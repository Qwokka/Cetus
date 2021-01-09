import { put } from 'redux-saga/effects'

import { bigintIsNaN, realAddressToIndex } from '~/utils/helpers'

import { searchActionSucceed } from '~/store/search/searchPageReducer'

import { updateExtensionValues, postBgMessage } from '~/store/extension/extensionReducer'

export function* updateSearchFormSaga({ payload }) {
  try {
    const { results } = payload
    yield put(
      searchActionSucceed({
        resultCount: results.count,
        resultObject: results.object,
      })
    )
  } catch (error) {
    console.log('SAGA ERROR: updateSearchFormSaga', error)
  }
}

export function* searchSaga({ data }) {
  try {
    const compare = data.currentOperator
    const memType = data.currentType

    let param = data.query

    let lowerAddr = data.lower
    let upperAddr = data.upper

    if (lowerAddr == '' || bigintIsNaN(lowerAddr)) {
      lowerAddr = 0
    }

    if (upperAddr == '' || bigintIsNaN(upperAddr)) {
      upperAddr = 0xffffffff
    }

    const lowerIndex = realAddressToIndex(lowerAddr, memType)
    const upperIndex = realAddressToIndex(upperAddr, memType)

    yield put(updateExtensionValues({ searchMemType: memType }))

    if (bigintIsNaN(param) || param == '') {
      param = null
    }

    yield put(
      postBgMessage({
        type: 'search',
        body: {
          memType: memType,
          memAlign: true,
          compare: compare,
          param: param,
          lower: lowerIndex,
          upper: upperIndex,
        },
      })
    )
  } catch (error) {
    console.log('SAGA ERROR: searchSaga', error)
  }
}

export function* clearResultsSaga() {
  try {
    yield put(postBgMessage({ type: 'restartSearch' }))
  } catch (error) {
    console.log('SAGA ERROR: clearResultsSaga', error)
  }
}
