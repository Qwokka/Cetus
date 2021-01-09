import { connect } from 'react-redux'

import {
  // Actions
  toggleSpeedhack,
  // Getters/Selectors
  speedhackGetter,
  multiplierGetter,
} from '~/store/speedhack/speedhackReducer'

import SpeedhackPage from '~/pages/SpeedhackPage'

const mapStateToProps = (state) => ({
  speedhack: speedhackGetter(state),
  multiplier: multiplierGetter(state),
  isLoading: state.speedhack.isLoading,
})

const mapDispatchToProps = {
  toggleSpeedhack,
}

export default connect(mapStateToProps, mapDispatchToProps)(SpeedhackPage)
