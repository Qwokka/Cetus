import chai, { expect } from 'chai'
import sinon from 'sinon'
import typeToReducer, { setTypeDelimiter } from '../src/index'

chai.use(require('sinon-chai'))

describe('Handle Actions', function() {
  const fooAction = { type: 'FOO' }

  it('returns a reducer function', ()=> {
    const state = { test: 'state' }
    const reducer = typeToReducer()
    expect(reducer(state, fooAction)).to.eql(state)
  })

  it('accepts an initialState for the reducer', ()=> {
    const initialState = { initial: 'state' }
    const reducer = typeToReducer({}, initialState)
    expect(reducer(undefined, fooAction)).to.eql(initialState)
  })

  context('Given A Flat Reducer Config', ()=> {
    const initialState = { initial: 'state' }
    beforeEach(()=> {
      this.reducerConfig = {
        FOO: sinon.spy(() => ({ state: 'foo' })),
        BAR: sinon.spy(() => ({ state: 'bar' })),
      }
      this.reducer = typeToReducer(this.reducerConfig, initialState)
    })

    it('ignores reducers when no matching type', ()=> {
      const differentAction = { type: 'DIFFERENT' }
      const newState = this.reducer(undefined, differentAction)
      expect(newState).to.eql(initialState)
      expect(this.reducerConfig.FOO).to.have.callCount(0)
      expect(this.reducerConfig.BAR).to.have.callCount(0)
    })

    it('calls the reducer mapped to the action type', ()=> {
      const state = { given: 'state' }
      this.reducer(state, fooAction)
      expect(this.reducerConfig.FOO).to.have.callCount(1)
      expect(this.reducerConfig.FOO).to.have.been.calledWith(
        state, fooAction
      )
      expect(this.reducerConfig.BAR).to.have.callCount(0)
    })

    it('returns the value from the called reducer', ()=> {
      const actual = this.reducer({}, fooAction)
      const expected = this.reducerConfig.FOO()
      expect(actual).to.eql(expected)
    })
  })

  context('Given A Nested Reducer', ()=> {
    const initialState = { initial: 'state' }
    beforeEach(()=> {
      this.reducerConfig = {
        FOO: {
          'HERP': sinon.spy(() => ({ state: 'foo_herp' })),
          'DERP': {
            'BAR': sinon.spy(() => ({ state: 'foo_derp_bar' })),
          },
        },
      }
      this.reducer = typeToReducer(this.reducerConfig, initialState)
    })

    it('calls nested reducers with matching prefixed_type', ()=> {
      const state = { given: 'state' }
      const fooHerpAction = { type: 'FOO_HERP' }
      this.reducer(state, fooHerpAction)
      expect(this.reducerConfig.FOO.HERP).to.have.callCount(1)
      expect(this.reducerConfig.FOO.DERP.BAR).to.have.callCount(0)
      expect(this.reducerConfig.FOO.HERP).to.have.been.calledWith(
        state, fooHerpAction
      )
    })

    it('calls deeply nested reducers with matching prefixed_type', ()=> {
      const state = { given: 'state' }
      const fooDerpBarAction = { type: 'FOO_DERP_BAR' }
      this.reducer(state, fooDerpBarAction)
      expect(this.reducerConfig.FOO.DERP.BAR).to.have.callCount(1)
      expect(this.reducerConfig.FOO.HERP).to.have.callCount(0)
      expect(this.reducerConfig.FOO.DERP.BAR).to.have.been.calledWith(
        state, fooDerpBarAction
      )
    })
  })

  context('Given A Custom Type Delimiter Nested Reducer', ()=> {
    const initialState = { initial: 'state' }
    beforeEach(()=> {
      this.reducerConfig = {
        FOO: {
          'HERP': sinon.spy(() => ({ state: 'foo_herp' })),
          'DERP': {
            'BAR': sinon.spy(() => ({ state: 'foo_derp_bar' })),
          },
        },
      }
      setTypeDelimiter('|')
      this.reducer = typeToReducer(this.reducerConfig, initialState)
    })

    it('calls deeply nested reducers with matching prefixed_type', ()=> {
      const state = { given: 'state' }
      const fooDerpBarAction = { type: 'FOO|DERP|BAR' }
      this.reducer(state, fooDerpBarAction)
      expect(this.reducerConfig.FOO.DERP.BAR).to.have.callCount(1)
      expect(this.reducerConfig.FOO.HERP).to.have.callCount(0)
      expect(this.reducerConfig.FOO.DERP.BAR).to.have.been.calledWith(
        state, fooDerpBarAction
      )
    })
  })
})
