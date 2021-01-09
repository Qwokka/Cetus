[![Circle CI](https://circleci.com/gh/tomatau/type-to-reducer/tree/master.svg?style=svg)](https://circleci.com/gh/tomatau/type-to-reducer/tree/master)

# type-to-reducer

[![Greenkeeper badge](https://badges.greenkeeper.io/tomatau/type-to-reducer.svg)](https://greenkeeper.io/)

This module provides a function `typeToReducer`, which accepts an object (`reducerMap`) and returns a reducer function composing other reducer functions described by the `reducerMap`.

## Why?

This is pretty much the same as the `handleActions` function you can find in https://github.com/acdlite/redux-actions. The differences being, `type-to-reducer` only exposes the function as a default, and allows nesting of the `reducerMap` object.

## Usage

`npm install type-to-reducer --save`

The `reducerMap` you supply to the function will have keys that correspond to dispatched action types and the values for those keys will be reducer functions. When the returned reducer function is called with state and an action object, the action's type will be matched against the previously provided `reducerMap` keys, if a match is found, the key's value (the reducer function) will be invoked with the store's state and the action.

Also, you can describe an initial state with the second argument to `typeToReducer`.

Oh and you can also set `reducerMap`s as the values too, these objects will be nested instances of the same shaped object you supplied to `typeToReducer`.

If that sounded a bit complicated, the example below should make it clearer. NB, it helps if you're familiar with redux.

```js
import typeToReducer from 'type-to-reducer'
import { GET, UPDATE } from 'app/actions/foo'

const initialState = {
  data: null,
  isPending: false,
  error: false
}

// supply the reducerMap object
export const myReducer = typeToReducer({
  // e.g. GET === 'SOME_ACTION_TYPE_STRING_FOR_GET'
  [GET]: (state, action) => ({
    ...state,
    data: action.payload
  }),
  [UPDATE]: (state, action) => ({
    ...state,
    data: action.payload
  })
}, initialState)
```

Then the `myReducer` would be used like so:

```js
let state = { foo: 'bar' }

let newState = myReducer(state, {
  type: GET,
  payload: `an action's payload.`
})

// newState will deep equal { foo: 'bar', data: `an action's payload.` }
```

Group reducers by a prefix when objects are nested.

```js
import typeToReducer from 'type-to-reducer'
import { API_FETCH } from 'app/actions/bar'

const initialState = {
  data: null,
  isPending: false,
  error: false
}

export const myReducer = typeToReducer({
  [ API_FETCH ]: {
    PENDING: () => ({
      ...initialState,
      isPending: true
    }),
    REJECTED: (state, action) => ({
      ...initialState,
      error: action.payload,
    }),
    FULFILLED: (state, action) => ({
      ...initialState,
      data: action.payload
    })
  }
}, initialState)

// usage
let previousState = Whatever;

let newState = myReducer(previousState, {
  type: API_FETCH + '_' + PENDING,
})

// newState shallow deeply equals { isPending: true }
```

## Custom Type Delimiter

You can add a custom type delimiter instead of the default `'_'`.

This will set it for every reducer you create after the custom delimiter is set, yes a dirty stateful function. This is for convenience so you can set it for your whole project up front and not to pollute the main function abstraction for rare settings.

```js
import typeToReducer, {setTypeDelimiter} from 'type-to-reducer'
import { API_FETCH } from 'app/actions/bar'

const initialState = {
  data: null,
  isPending: false,
}

setTypeDelimiter('@_@')

export const myReducer = typeToReducer({
  [ API_FETCH ]: {
    PENDING: () => ({
      ...initialState,
      isPending: true
    }),
  }
}, initialState)

// Then use the delimiter in your action type
myReducer(someState, {
  type: API_FETCH + '@_@' + PENDING,
})
```
