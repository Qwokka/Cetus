import typeToReducer from 'type-to-reducer'

export const SEARCH_PAGE_SEARCH = 'searchPage/search'
export const SEARCH_PAGE_SEARCH_SUCCEED = 'searchPage/searchSucceed'
export const SEARCH_PAGE_SEARCH_FAILED = 'searchPage/searchFailed'

export const SEARCH_PAGE_UPDATE_FORM = 'searchPage/updateForm'
export const SEARCH_PAGE_CLEAR_RESULTS = 'searchPage/clearResults'

const DefaultProps = {
  results: null,
  count: null,
  isLoading: false,
  isResultsVisible: false,
  formData: {
    value: null,
    comparison: 'eq',
    valueType: 'i32',
    rangeUpper: '',
    rangeLower: '',
  },
}

export const searchResultsGetter = (state) => state.searchPage.results
export const resultsCounterGetter = (state) => state.searchPage.count
export const formDataGetter = (state) => state.searchPage.formData
export const isLoadingGetter = (state) => state.searchPage.isLoading
export const isResultsVisibleGetter = (state) => state.searchPage.isResultsVisible

export default typeToReducer(
  {
    [SEARCH_PAGE_SEARCH]: (state, { payload }) => {
      return {
        ...DefaultProps,
        isLoading: true,
      }
    },

    [SEARCH_PAGE_SEARCH_SUCCEED]: (state, { payload }) => {
      const { resultCount, resultObject } = payload

      const formattedResults = Object.keys(resultObject).map((i) => ({
        index: i,
        value: resultObject[i],
      }))

      return {
        ...state,
        isLoading: false,
        isResultsVisible: true,
        count: resultCount,
        results: formattedResults,
      }
    },

    [SEARCH_PAGE_UPDATE_FORM]: (state, { payload }) => {
      const { results, ...formData } = payload // results will be passed to SEARCH_PAGE_SEARCH_SUCCEED by searchSaga

      return {
        ...state,
        formData: {
          ...formData,
        },
      }
    },

    [SEARCH_PAGE_CLEAR_RESULTS]: () => ({
      ...DefaultProps,
    }),
  },
  DefaultProps
)

export const searchAction = (data) => ({
  type: SEARCH_PAGE_SEARCH,
  data,
})

export const searchActionSucceed = (payload) => ({
  type: SEARCH_PAGE_SEARCH_SUCCEED,
  payload,
})

export const updateSearchForm = (payload) => ({
  type: SEARCH_PAGE_UPDATE_FORM,
  payload,
})

export const clearSearchResults = () => ({
  type: SEARCH_PAGE_CLEAR_RESULTS,
})
