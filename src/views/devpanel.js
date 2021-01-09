import React, { Component } from 'react'
import { render } from 'react-dom'
import { Provider } from 'react-redux'
import store from '~/store'
import StyleVarsProvider from '~/containers/StyleVarsProvider'

import { DevpanelContainer } from '~/containers/ExtensionContainer'

class DevpanelView extends Component {
  render() {
    return (
      <Provider store={store}>
        <StyleVarsProvider />
        <DevpanelContainer />
      </Provider>
    )
  }
}

if (document.getElementById('app')) {
  render(<DevpanelView />, document.getElementById('app'))
}

if (module.hot) {
  module.hot.accept();
}
