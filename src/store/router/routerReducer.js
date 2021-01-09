import typeToReducer from 'type-to-reducer'

export const SEARCH_PAGE = 'router/searchPage'
export const BOOKMARKS_PAGE = 'router/bookmarksPage'
export const PATCH_PAGE = 'router/patchPage'
export const SPEEDHACK_PAGE = 'router/speedhackPage'
export const WAITING_PAGE = 'router/waitingPage'

const DefaultProps = {
  currentPage: process.env.NODE_ENV === 'development' ? SEARCH_PAGE : WAITING_PAGE, 
}

export default typeToReducer(
  {
    [SEARCH_PAGE]: () => {
      return {
        ...DefaultProps,
        currentPage: SEARCH_PAGE,
      }
    },
    [BOOKMARKS_PAGE]: () => {
      return {
        ...DefaultProps,
        currentPage: BOOKMARKS_PAGE,
      }
    },
    [PATCH_PAGE]: () => {
      return {
        ...DefaultProps,
        currentPage: PATCH_PAGE,
      }
    },
    [SPEEDHACK_PAGE]: () => {
      return {
        ...DefaultProps,
        currentPage: SPEEDHACK_PAGE,
      }
    },
    [WAITING_PAGE]: () => {
      return {
        ...DefaultProps,
        currentPage: WAITING_PAGE,
      }
    },
  },
  DefaultProps
)

export const linkToSearchPage = () => ({
  type: SEARCH_PAGE,
})

export const linkToBookmarksPage = () => ({
  type: BOOKMARKS_PAGE,
})

export const linkToPatchPage = () => ({
  type: PATCH_PAGE,
})

export const linkToSpeedhackPage = () => ({
  type: SPEEDHACK_PAGE,
})

export const linkToWaitingPage = () => ({
  type: WAITING_PAGE,
})

export const currentPageGetter = (state) => state.router.currentPage
