import React from 'react'
import styled from 'styled-components'

import {
  SEARCH_PAGE,
  BOOKMARKS_PAGE,
  PATCH_PAGE,
  SPEEDHACK_PAGE,
  WAITING_PAGE,
} from '~/store/router/routerReducer'

import SearchPageСontainer from '~/containers/SearchPageContainer'
import BookmarksPage from '~/containers/BookmarksPageContainer'
import SpeedhackPageContainer from '~/containers/SpeedhackPageContainer'

import Modal from './Modal'

import PatchPage from '~/pages/PatchPage'
import WaitingPage from '~/pages/WaitingPage'

const PagesComponent = ({ currentPage }) => (
  <Wrapper>
    {currentPage === SEARCH_PAGE && <SearchPageСontainer />}
    {currentPage === BOOKMARKS_PAGE && <BookmarksPage />}
    {currentPage === PATCH_PAGE && <PatchPage />}
    {currentPage === SPEEDHACK_PAGE && <SpeedhackPageContainer />}
    {currentPage === WAITING_PAGE && <WaitingPage />}
  </Wrapper>
)

const Wrapper = styled.div`
  color: var(--colorText);
  flex: 1 1 auto;
  max-width: 100%;
`

export default PagesComponent
