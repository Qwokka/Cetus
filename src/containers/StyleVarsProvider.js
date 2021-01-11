import React from 'react'
import { connect } from 'react-redux'
import { styleVarsGetter } from '~/store/utils/themeReducer'

const StyleVarsProvider = ({ styleVars }) => <style>{styleVars}</style>

const mapStateToProps = (state) => ({
  styleVars: styleVarsGetter(state),
})

const mapDispatchToProps = {}

export default connect(mapStateToProps, mapDispatchToProps)(StyleVarsProvider)
