import React, { Component } from 'react'
import styled from 'styled-components'

import {
  SEARCH_PAGE,
  BOOKMARKS_PAGE,
  PATCH_PAGE,
  SPEEDHACK_PAGE,
  WAITING_PAGE,
} from '~/store/router/routerReducer'

import PagesComponent from '~/components/PagesComponent'

import MoonSvg from '~/components/assets/moon.svg'
import SunSvg from '~/components/assets/sun.svg'

class Devpanel extends Component {
  constructor(props) {
    super(props)

    props.initBgChannel()
    props.setIsPopup(false)
  }

  render() {
    // actions
    const {
      switchDark,
      switchLight,
      linkToBookmarksPage,
      linkToSearchPage,
      linkToPatchPage,
      linkToSpeedhackPage,
    } = this.props

    // data
    const { currentTheme, currentPage } = this.props

    return (
      <Wrapper>
        {currentPage !== WAITING_PAGE && (
          <NavigationWrapper>
            <Navigation>
              <NavigationItem isActive={SEARCH_PAGE === currentPage} onClick={linkToSearchPage}>
                Search
              </NavigationItem>
              <NavigationItem
                isActive={BOOKMARKS_PAGE === currentPage}
                onClick={linkToBookmarksPage}
              >
                Bookmarks
              </NavigationItem>
              <NavigationItem isActive={PATCH_PAGE === currentPage} onClick={linkToPatchPage}>
                Patch
              </NavigationItem>
              <NavigationItem
                isActive={SPEEDHACK_PAGE === currentPage}
                onClick={linkToSpeedhackPage}
              >
                Speed Hack
              </NavigationItem>
            </Navigation>

            <ThemeChanger>
              <IconWrapper active={currentTheme === 'dark'} onClick={switchDark}>
                <MoonSvg />
              </IconWrapper>
              <IconWrapper active={currentTheme === 'light'} onClick={switchLight}>
                <SunSvg />
              </IconWrapper>
            </ThemeChanger>
          </NavigationWrapper>
        )}

        <PageWrapper>
          <PagesComponent currentPage={currentPage} />
        </PageWrapper>
      </Wrapper>
    )
  }
}

const Wrapper = styled.div`
  min-height: 100vh;
  display: flex;
  padding: var(--mainLayoutPadding);
  background: var(--mainBackground);
`

const Text = styled.div`
  color: var(--colorText);
`

const NavigationWrapper = styled.div`
  display: flex;
  flex-flow: column nowrap;
  flex: 1 1 auto;
  max-width: 200px;
  max-height: 89vh;
  position: sticky;
  top: var(--mainLayoutPadding);
`

const Navigation = styled.div`
  display: flex;
  flex-flow: column nowrap;
  flex: 1 1 auto;
`

const NavigationItem = styled.div`
  font-weight: 600;
  font-size: 17px;
  line-height: 146.16%;
  display: flex;
  align-items: center;
  letter-spacing: 0.02em;
  color: var(--colorText);
  opacity: ${({ isActive }) => (isActive ? '1' : '.5')};
  cursor: pointer;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 1;
  }

  &:not(:first-child) {
    margin-top: 17px;
  }
`

const ThemeChanger = styled.div`
  display: flex;
  flex-flow: row nowrap;
`

const IconWrapper = styled.div`
  cursor: pointer;
  opacity: ${({ active }) => (active ? '1' : '.25')};

  svg {
    width: 31px;
    height: 31px;

    path {
      fill: var(--colorText);
    }
  }

  &:not(:first-child) {
    margin-left: 8px;
  }
`

const PageWrapper = styled.div`
  display: flex;
  flex: 1 1 auto;
`

export default Devpanel
