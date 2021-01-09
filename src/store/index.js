import '@babel/polyfill'

import { createStore, applyMiddleware, compose } from 'redux'
import { createLogger } from 'redux-logger'
import createSagaMiddleware from 'redux-saga'

import rootReducer from '~/store/rootReducer'
import rootSaga from '~/store/rootSaga'

const configureStore = () => {
  // Redux Configuration
  const middleware = []
  const enhancers = []

  // Logging Middleware
  const logger = createLogger({
    level: 'info',
    collapsed: true,
  })

  const appSagasMiddleware = createSagaMiddleware()

  middleware.push(logger)
  middleware.push(appSagasMiddleware)

  // Apply Middleware & Compose Enhancers
  enhancers.push(applyMiddleware(...middleware))
  const enhancer = compose(...enhancers)

  // Create Store
  const store = createStore(rootReducer, {}, enhancer)

  appSagasMiddleware.run(rootSaga)

  return store
}

const store = configureStore()

export default store
