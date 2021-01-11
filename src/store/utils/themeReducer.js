import typeToReducer from 'type-to-reducer'

import { styles, commonStyles } from '~/utils/styleVars'

export const SWITCH_THEME_DARK = 'theme/switchDark'
export const SWITCH_THEME_LIGHT = 'theme/switchLight'

const formatStyleVars = (currentTheme) =>
  [
    ':root {',
    ...Object.keys(styles[currentTheme]).map((key) => `--${key}: ${styles[currentTheme][key]};`),
    ...Object.keys(commonStyles).map((key) => `--${key}: ${commonStyles[key]};`),
    '}',
  ].join('')

const DefaultProps = {
  currentTheme: 'dark',
  styleVars: formatStyleVars('dark'),
}

export default typeToReducer(
  {
    [SWITCH_THEME_DARK]: () => {
      return {
        ...DefaultProps,
        currentTheme: 'dark',
        styleVars: formatStyleVars('dark'),
      }
    },
    [SWITCH_THEME_LIGHT]: () => {
      return {
        ...DefaultProps,
        currentTheme: 'light',
        styleVars: formatStyleVars('light'),
      }
    },
  },
  DefaultProps
)

export const switchDark = () => ({
  type: SWITCH_THEME_DARK,
})

export const switchLight = () => ({
  type: SWITCH_THEME_LIGHT,
})

export const themeGetter = (state) => state.theme.currentTheme
export const styleVarsGetter = (state) => state.theme.styleVars
