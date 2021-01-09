import React, { Component } from 'react'
import { render } from 'react-dom'
import { Provider } from 'react-redux'
import store from '~/store'

import StyleVarsProvider from '~/containers/StyleVarsProvider'

import { PopupContainer } from '~/containers/ExtensionContainer'

class PopupView extends Component {
  render() {
    return (
      <Provider store={store}>
        <StyleVarsProvider />
        <PopupContainer />
      </Provider>
    )
  }
}

if (document.getElementById('app')) {
  render(<PopupView />, document.getElementById('app'))
}

if (module.hot) {
  module.hot.accept();
}
