import React, { Component, createRef } from 'react'
import styled from 'styled-components'

import {
  SEARCH_PAGE,
  BOOKMARKS_PAGE,
  PATCH_PAGE,
  SPEEDHACK_PAGE,
  WAITING_PAGE,
} from '~/store/router/routerReducer'

import PagesComponent from '~/components/PagesComponent'
import Modal from '~/components/Modal'

import MoonSvg from '~/components/assets/moon.svg'
import SunSvg from '~/components/assets/sun.svg'

class Popup extends Component {
  constructor(props) {
    super(props)

    this.caretRef = createRef()
    props.initBgChannel()
    props.setIsPopup(true)
  }

  linkToPage = (pageAction, event) => {
    this._calcCaret(this.caretRef.current, event.target)
    return pageAction()
  }

  _calcCaret = ($caret, $navItem) => {
    $caret.style = `transform: translateX(${$navItem.offsetLeft}px); width: ${$navItem.offsetWidth}px;`
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
              <NavigationItem
                isActive={SEARCH_PAGE === currentPage}
                onClick={(e) => this.linkToPage(linkToSearchPage, e)}
              >
                Search
              </NavigationItem>
              <NavigationItem
                isActive={BOOKMARKS_PAGE === currentPage}
                onClick={(e) => this.linkToPage(linkToBookmarksPage, e)}
              >
                Bookmarks
              </NavigationItem>
              <NavigationItem
                isActive={PATCH_PAGE === currentPage}
                onClick={(e) => this.linkToPage(linkToPatchPage, e)}
              >
                Patch
              </NavigationItem>
              <NavigationItem
                isActive={SPEEDHACK_PAGE === currentPage}
                onClick={(e) => this.linkToPage(linkToSpeedhackPage, e)}
              >
                Speed Hack
              </NavigationItem>

              <Caret ref={this.caretRef} />
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
  width: 456px;
  height: 600px;
  display: flex;
  flex-flow: column nowrap;
  background: var(--mainBackground);
`

const Text = styled.div`
  color: var(--colorText);
`

const NavigationWrapper = styled.div`
  display: flex;
  flex-flow: row nowrap;
  padding: 0 var(--popupLayoutPadding);
  border-bottom: 1px solid var(--popupBorder);
  position: relative;
`

const Caret = styled.div`
  position: absolute;
  bottom: 0;
  height: 2px;
  width: 41px;
  left: 0;
  transform: translateX(16px);
  background: var(--popupCaretBackground);
  transition: transform 0.2s ease, width 0.2s ease;
  will-change: width;
`

const Navigation = styled.div`
  display: flex;
  flex-flow: row nowrap;
  flex: 1 1 auto;
`

const NavigationItem = styled.div`
  font-style: normal;
  font-weight: 600;
  font-size: 12px;
  line-height: 18px;
  display: flex;
  align-items: center;
  letter-spacing: 0.02em;
  color: var(--colorText);
  opacity: ${({ isActive }) => (isActive ? '1' : '.5')};
  cursor: pointer;
  transition: opacity 0.2s ease;
  padding: var(--popupLayoutPadding) 0;

  &:hover {
    opacity: 1;
  }

  &:not(:first-child) {
    margin-left: 28px;
  }
`

const ThemeChanger = styled.div`
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
`

const IconWrapper = styled.div`
  cursor: pointer;
  opacity: ${({ active }) => (active ? '1' : '.25')};
  transition: opacity 0.2s ease;

  svg {
    width: 24px;
    height: 24px;

    path {
      fill: var(--colorText);
    }
  }

  &:not(:first-child) {
    margin-left: 8px;
  }

  &:hover {
    opacity: 1;
  }
`

const PageWrapper = styled.div`
  display: flex;
  flex: 1 1 auto;
  max-height: 100%;
  overflow-y: auto;
  padding: 0 var(--popupLayoutPadding);
`

export default Popup
