import store from '~/store'
import { bigintJsonParse } from '~/utils/helpers'

import { linkToSearchPage, linkToWaitingPage } from '~/store/router/routerReducer'

import { updateExtensionValues, updateStackTraceSucceed } from '~/store/extension/extensionReducer'

import { updateSpeedhackSucceed } from '~/store/speedhack/speedhackReducer'

import {
  searchActionSucceed,
  updateSearchForm,
  clearSearchResults,
} from '~/store/search/searchPageReducer'

import { updateBookmark } from '~/store/bookmarks/bookmarksReducer'

import { searchFunctionSucceed } from '~/store/patches/patchesReducer'

export default function (msgRaw) {
  const msg = bigintJsonParse(msgRaw)

  const type = msg.type
  const msgBody = msg.body

  console.log('bg message listener', msgBody, type)

  switch (type) {
    case 'init':
      store.dispatch(linkToSearchPage())
      store.dispatch(updateExtensionValues({ url: msgBody.url, symbols: msgBody.symbols }))

      break
    case 'popupRestore':
      if (msgBody.initialized) {
        store.dispatch(linkToSearchPage())
      }

      store.dispatch(
        updateExtensionValues({
          url: msgBody.url,
          symbols: msgBody.symbols,
          searchMemType: msgBody.searchForm.valueType,
        })
      )

      store.dispatch(updateSearchForm(msgBody.searchForm))
      store.dispatch(updateSpeedhackSucceed(msgBody.speedhack))
      // updateSearchForm(msgBody.searchForm);
      // updateSpeedhackForm(msgBody.speedhack);
      // updateStackTraceTable(msgBody.stackTraces);
      // store.dispatch({ type: SEARCH_PAGE_UPDATE_FORM, payload: msgBody.searchForm })

      break
    case 'searchResult':
      const resultCount = msgBody.count
      const resultObject = msgBody.results
      const resultMemType = msgBody.memType

      if (typeof resultCount !== 'number' || typeof resultObject !== 'object') {
        return
      }

      store.dispatch(searchActionSucceed({ resultCount, resultObject, resultMemType }))

      break
    case 'updateBookmarks':
      const bookmarks = msgBody.bookmarks
      store.dispatch(updateBookmark(bookmarks))
      break
    case 'queryFunctionResult':
      if (typeof msgBody.bytes !== 'object') {
        return
      }

      const funcIndex = msgBody.funcIndex
      const funcArray = Object.values(msgBody.bytes)
      const funcBytes = new Uint8Array(funcArray)

      const givenLineNum = msgBody.lineNum

      const disassembly = disassembleFunction(funcBytes)
      const funcText = disassembly.text

      const realLineNum = disassembly.lineNums[givenLineNum]

      // updatePatchWindow(funcIndex, funcText, realLineNum)
      store.dispatch(searchFunctionSucceed({funcIndex, funcText, realLineNum}))

      changeTab('tabPatch')

      break
    case 'watchPointHit':
      store.dispatch(updateStackTraceSucceed(msgBody))
      // updateStackTraceTable(extension.getStackTraces());

      break
    case 'reset':
      store.dispatch(linkToWaitingPage())
      store.dispatch(clearSearchResults())

      break
  }
}
