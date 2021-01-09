import { connect } from 'react-redux'

import Devpanel from '~/components/Devpanel'
import Popup from '~/components/Popup'

// actions
import { switchDark, switchLight } from '~/store/utils/themeReducer'

import {
  linkToSearchPage,
  linkToBookmarksPage,
  linkToPatchPage,
  linkToSpeedhackPage,
} from '~/store/router/routerReducer'

import { initBgChannel, setIsPopup } from '~/store/extension/extensionReducer'

// getters
import { themeGetter } from '~/store/utils/themeReducer'
import { currentPageGetter } from '~/store/router/routerReducer'

const mapStateToProps = (state) => {
  return {
    currentTheme: themeGetter(state),
    currentPage: currentPageGetter(state),
  }
}

const mapDispatchToProps = {
  setIsPopup,
  switchLight,
  switchDark,
  linkToSearchPage,
  linkToBookmarksPage,
  linkToPatchPage,
  linkToSpeedhackPage,
  // core
  initBgChannel,
}

export const DevpanelContainer = connect(mapStateToProps, mapDispatchToProps)(Devpanel)
export const PopupContainer = connect(mapStateToProps, mapDispatchToProps)(Popup)
