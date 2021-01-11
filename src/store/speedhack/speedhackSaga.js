import { put } from 'redux-saga/effects'

import { postBgMessage } from '~/store/extension/extensionReducer'

export function* toggleSpeedHackSaga({ multiplier }) {
  try {
    yield put(
      postBgMessage({
        type: 'shToggle',
        body: {
          multiplier,
        },
      })
    )
  } catch (error) {
    console.log('SAGA ERROR: toggle speed hack', error)
    yield put({ type: EXTENSION_POST_FAILED })
  }
}
