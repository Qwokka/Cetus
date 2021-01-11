import React, { Component } from 'react'
import styled from 'styled-components'
import { indexToRealAddress, toHex } from '~/utils/helpers'

import {
  Title,
  Description,
  Label,
  TableCell,
  Button,
  Input,
} from '~/components/Common/CommonStyled'

class SearchPage extends Component {
  constructor(props) {
    super(props)

    this.state = {
      comparsionOperators: ['eq', 'ne', 'lt', 'gte', 'lte', 'gt'],
      valueTypes: ['i8', 'i16', 'i32', 'i64', 'f32', 'f64'],

      currentOperator: 'eq',
      currentType: 'i32',

      lower: '',
      upper: '',

      query: null,
      searchResults: [],
      count: null,
      isInitialPending: true,
    }
  }

  // get formData from restore popup
  static getDerivedStateFromProps(props, state) {
    if (state.isInitialPending && state.query !== props.formData.value) {
      return {
        count: props.count,
        query: props.formData.value,
        isInitialPending: false,
      }
    }
    return state
  }

  handleChangeCompare = (o) =>
    this.setState({
      currentOperator: o,
    })

  handleChangeType = (t) =>
    this.setState({
      currentType: t,
    })

  handleChangeSearch = (e) =>
    this.setState({
      query: e.target.value,
    })

  handleChangeLower = (e) =>
    this.setState({
      lower: e.target.value,
    })

  handleChangeUpper = (e) =>
    this.setState({
      upper: e.target.value,
    })

  search = (e) => {
    const { searchAction } = this.props

    const { currentOperator, currentType, query, lower, upper } = this.state

    searchAction({
      currentOperator,
      currentType,
      query,
      lower,
      upper,
    })
  }

  clearResults = () => {
    this.props.clearSearchResults()
  }

  saveBookmark = (item, type) => {
    this.props.addBookmark(indexToRealAddress(item.index, type), type)
  }

  removeBookmark = (item, type) => {
    this.props.removeBookmark(indexToRealAddress(item.index, type))
  }

  _formatIndex = (index, type) => {
    return toHex(indexToRealAddress(index, type))
  }

  _isIndexInBookmark = (item) => {
    const { currentType } = this.state
    return this.props.bookmarks.find((b) => +b === indexToRealAddress(item, currentType))
  }

  componentDidMount() {
    this.props.fetchBookmarks()
  }

  render() {
    const {
      comparsionOperators,
      valueTypes,
      currentOperator,
      currentType,
      lower,
      upper,
      query,
    } = this.state

    const { isPopup, count, isLoading, searchResults, formData, isResultsVisible } = this.props

    return (
      <Wrapper isPopup={isPopup}>
        <Left isPopup={isPopup}>
          {!isPopup && (
            <div>
              <Title>Hey! It’s a search page. </Title>
              <Title>Try to find a function using form below.</Title>
              <Description>Resilts will appear in the right collumn.</Description>
            </div>
          )}

          <Content>
            <Label>Function index</Label>
            <InputWrapper>
              <Input
                type="text"
                placeholder="Search for an function"
                value={query}
                onChange={this.handleChangeSearch}
              />
            </InputWrapper>
            <ItemWrapper>
              <Label>Comparsion operator</Label>
              <RadioWrapper>
                {comparsionOperators.map((operator) => (
                  <Radio key={operator} isActive={operator === currentOperator}>
                    <RadioInput
                      id={`compare-${operator}`}
                      type="radio"
                      name="compare"
                      value={operator}
                      checked={operator === currentOperator}
                      onChange={(_) => this.handleChangeCompare(operator)}
                    />
                    <Val htmlFor={`compare-${operator}`}> {operator.toUpperCase()} </Val>
                  </Radio>
                ))}
              </RadioWrapper>
            </ItemWrapper>
            <ItemWrapper>
              <Label>Value type</Label>
              <RadioWrapper>
                {valueTypes.map((type) => (
                  <Radio key={type} isActive={type === currentType}>
                    <RadioInput
                      id={`type-${type}`}
                      type="radio"
                      name="type"
                      value={type}
                      checked={type === currentType}
                      onChange={(_) => this.handleChangeType(type)}
                    />
                    <Val htmlFor={`type-${type}`}> {type} </Val>
                  </Radio>
                ))}
              </RadioWrapper>
            </ItemWrapper>

            <ItemWrapper>
              <Label>Range</Label>
              <Inputs>
                <Input
                  type="text"
                  value={lower}
                  placeholder="From 0"
                  onChange={this.handleChangeLower}
                />
                <Input
                  type="text"
                  value={upper}
                  placeholder="To 0xFFFFFFFF"
                  onChange={this.handleChangeUpper}
                />
              </Inputs>
            </ItemWrapper>

            <ItemWrapper>
              <Button onClick={this.search}>Search</Button>
            </ItemWrapper>
          </Content>
        </Left>

        <Right isPopup={isPopup}>
          {count > 0 && (
            <RightWrapper>
              <Head>
                <Title>We found {count} results</Title>
                <Clear onClick={this.clearResults}>Clear</Clear>
              </Head>

              <DescriptionSearch>
                You can click on “Save” button to save a specific row into bookmarks
              </DescriptionSearch>

              {searchResults && searchResults.length > 0 && (
                <SearchResultTable>
                  <Heading>
                    <TableItemIndex head>Index</TableItemIndex>
                    <TableItemValue head>Value</TableItemValue>
                    <TableItemAction head></TableItemAction>
                  </Heading>
                  <Body>
                    {searchResults.map((result, index) => (
                      <ResultWrapper key={index}>
                        <TableItemIndex>
                          {this._formatIndex(result.index, currentType)}
                        </TableItemIndex>
                        <TableItemValue>
                          <TableInput type="number" defaultValue={+result.value} />
                        </TableItemValue>
                        <TableItemAction>
                          {!this._isIndexInBookmark(result.index) ? (
                            <Save onClick={(_) => this.saveBookmark(result, currentType)}>
                              Save
                            </Save>
                          ) : (
                            <Remove onClick={(_) => this.removeBookmark(result, currentType)}>
                              Remove
                            </Remove>
                          )}
                        </TableItemAction>
                      </ResultWrapper>
                    ))}
                  </Body>
                </SearchResultTable>
              )}
            </RightWrapper>
          )}
        </Right>
      </Wrapper>
    )
  }
}

const SearchResultTable = styled.div``

const DescriptionSearch = styled(Description)`
  max-width: 55%;
`

const Body = styled.div`
  margin-top: 12px;

  & > div:not(:first-child) {
    margin-top: 14px;
  }
`

const Heading = styled.div`
  display: flex;
  flex-flow: row nowrap;
  margin-top: 20px;
`

const TableItemIndex = styled(TableCell)`
  flex: 1 1 30%;
`

const TableItemValue = styled(TableCell)`
  flex: 1 1 30%;
`

const TableItemAction = styled(TableCell)`
  flex: 1 1 30%;
  text-align: right;
`

const ResultWrapper = styled.div`
  display: flex;
  flex-flow: row nowrap;
`

const Save = styled.div`
  color: var(--colorText);
  opacity: 0.6;
  cursor: pointer;
  transition: color 0.2s ease, opacity 0.2s ease;

  &:hover {
    color: var(--activeColor);
    opacity: 1;
  }
`

const Remove = styled.div`
  color: var(--colorText);
  opacity: 0.6;
  cursor: pointer;
  transition: color 0.2s ease, opacity 0.2s ease;

  &:hover {
    color: var(--red);
  }
`

const TableInput = styled.input`
  background: var(--mainBackground);
  border: none;
  color: var(--colorText);
`

const Wrapper = styled.div`
  color: var(--colorText);
  display: flex;
  flex-flow: ${({ isPopup }) => (isPopup ? 'column nowrap' : 'row nowrap')};
`

const Content = styled.div`
  margin-top: 20px;
`

const ItemWrapper = styled.div`
  margin-top: 20px;
`

const InputWrapper = styled.div``

const RadioWrapper = styled.div`
  display: flex;
  flex-flow: row nowrap;

  border: 1px solid #8e8e93;
  box-sizing: border-box;
  border-radius: 5px;
`

const Radio = styled.div`
  width: calc(100% / 6);
  display: flex;
  justify-content: center;
  align-items: center;
  background: ${({ isActive }) => (isActive ? 'var(--activeColor)' : 'initial')};
  color: ${({ isActive }) => (isActive ? '#fff' : 'var(--colorText)')};
  transition: background 0.2s ease, color 0.2s ease;

  &:not(:first-child) {
    border-left: 1px solid #8e8e93;
  }
`

const RadioInput = styled.input`
  display: none;
`

const Val = styled.label`
  cursor: pointer;
  text-align: center;
  padding: 15px 5px;
  flex: 1 1 auto;
`

const Left = styled.div`
  flex: 1 1 auto;
  padding-right: ${({ isPopup }) => (!isPopup ? '82px' : '0')};
`

const Right = styled.div`
  flex: 2 1 auto;
  max-width: ${({ isPopup }) => (!isPopup ? '460px' : 'auto')};
  margin-top: ${({ isPopup }) => (!isPopup ? '0' : '33px')};
`

const RightWrapper = styled.div``

const Inputs = styled.div`
  display: flex;
  flex-flow: row nowrap;

  input {
    max-width: 50%;
  }

  input:not(:first-child) {
    margin-left: 5px;
  }
`

const Head = styled.div`
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  justify-content: space-between;
`

const Clear = styled.div`
  font-style: normal;
  font-weight: 600;
  font-size: 17px;
  line-height: 24px;
  letter-spacing: 0.02em;
  color: var(--red);
  cursor: pointer;
`

export default SearchPage
