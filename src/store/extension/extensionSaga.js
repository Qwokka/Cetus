import { put, select } from 'redux-saga/effects'

import {
  // action types (without payload)
  EXTENSION_INIT_BGCHANNEL_FAILED,
  EXTENSION_POST_FAILED,
  // actions with payload
  initBgChannel,
  initBgChannelSucceed,
  postBgMessage,
  // getters
  bgChannelGetter,
} from '~/store/extension/extensionReducer'

// import {
//   linkToSearchPage,
// } from '~/store/router/routerReducer'

import bgMessageListener from '~/utils/bgMessageListener'

export function* initBgChannelSaga() { 
  try {
    let bgChannel

    if (typeof chrome.extension.connect !== "undefined") {
      bgChannel = chrome.extension.connect({ name: "Background Page"});
    }
    else {
      bgChannel = browser.runtime.connect({ name: "Background Page"});
    }

    bgChannel.onMessage.addListener(bgMessageListener)

    if (bgChannel) {
      yield put(initBgChannelSucceed(bgChannel))
      yield put(postBgMessage({ type: 'popupConnected' }))
    } else {
      yield put({ type: EXTENSION_INIT_BGCHANNEL_FAILED })
    }
  } catch (error) {
    console.log('SAGA ERROR: initBgChannel', error)
    yield put({ type: EXTENSION_INIT_BGCHANNEL_FAILED })
  }
}

export function* postBgMessageSaga({ msg }) {
  try {
    const bgChannel = yield select(bgChannelGetter)
    console.log('SAGA: postBgMessage bgChannel', bgChannel, msg)
    if (bgChannel) {
      bgChannel.postMessage(msg)
    } else {
      yield put(initBgChannel())
      yield put(postBgMessage(msg))
    }
  } catch (error) {
    console.log('SAGA ERROR: postBgMessage', error)
    yield put({ type: EXTENSION_POST_FAILED })
  }
}