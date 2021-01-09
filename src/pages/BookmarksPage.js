import React, { useEffect, useCallback, useState } from 'react'
import styled from 'styled-components'

import Toggle from '~/components/Common/Toggle'
import Modal from '~/components/Modal'

import { TableCell, Title, Description, Button } from '~/components/Common/CommonStyled'

import { toHex } from '~/utils/helpers'

import ErrorSVG from '~/components/assets/error.svg'

const BookmarksPage = ({
  bookmarks,
  removeBookmark,
  updateFreeze,
  fetchBookmarks,
  updateMemory,
  updateWriteWatch,
  updateReadWatch,
  isPopup,
}) => {
  const [isConfirmationVisible, setIsVisible] = useState(false)
  const [removingItem, setRemovingItem] = useState(null)

  const showConfirmation = useCallback(
    (index) => {
      setIsVisible(true)
      setRemovingItem(index)
    },
    [setIsVisible, setRemovingItem]
  )

  const closeConfirmation = useCallback(() => {
    setRemovingItem(null)
    setIsVisible(false)
  }, [setIsVisible, setRemovingItem])

  const confirmRemove = useCallback(() => {
    removeBookmark(removingItem)
    closeConfirmation()
  }, [removingItem, closeConfirmation])

  const updateMemoryHandler = useCallback((index, value, type) => {
    return updateMemory(index, value, type)
  }, [])

  const updateWatchpointHandler = useCallback((index, value, updateFunction) => {
    return updateFunction(index, value)
  }, [])

  useEffect(() => {
    fetchBookmarks()
  }, [])

  return (
    <Wrapper>
      <Row>
        <IndexCell head>Index</IndexCell>
        <ValueCell head>Value</ValueCell>
        <ToggleCell head>Freeze</ToggleCell>
        <ToggleCell head>Trace</ToggleCell>
        <ToggleCell head>Wail</ToggleCell>
        <ActionCell />
      </Row>
      {bookmarks &&
        bookmarks.map((bookmark) => (
          <Row key={toHex(bookmark.index)}>
            <IndexCell>{toHex(bookmark.index)}</IndexCell>
            <ValueCell>
              <Input
                value={bookmark.data.value}
                onChange={(e) =>
                  updateMemoryHandler(bookmark.index, +e.target.value, bookmark.data.memType)
                }
              />
            </ValueCell>
            <ToggleCell>
              <Toggle
                isActive={bookmark.data.frozen}
                changeHandler={() =>
                  updateWatchpointHandler(bookmark.index, bookmark.data.value, updateFreeze)
                }
              />
            </ToggleCell>
            <ToggleCell>
              <Toggle
                isActive={bookmark.data.writeWatch}
                changeHandler={() =>
                  updateWatchpointHandler(bookmark.index, bookmark.data.value, updateWriteWatch)
                }
              />
            </ToggleCell>
            <ToggleCell>
              <Toggle
                isActive={bookmark.data.readWatch}
                changeHandler={() =>
                  updateWatchpointHandler(bookmark.index, bookmark.data.value, updateReadWatch)
                }
              />
            </ToggleCell>
            <ActionCell onClick={() => showConfirmation(bookmark.index)}>remove</ActionCell>
          </Row>
        ))}

      {isPopup && isConfirmationVisible && (
        <Modal onClose={closeConfirmation}>
          <ErrorSVGSyled />
          <Title>Are you sure to delete "{toHex(removingItem)}"?</Title>
          <Description>
            If you will delete it, no way to restore the index. Choose your answer clicking on big
            button
          </Description>

          <Buttons>
            <ButtonSure onClick={confirmRemove}>Sure</ButtonSure>
            <ButtonCancel onClick={closeConfirmation}>Cancel</ButtonCancel>
          </Buttons>
        </Modal>
      )}
    </Wrapper>
  )
}

const Wrapper = styled.div`
  color: var(--colorText);
  margin-top: 25px;
`

const Row = styled.div`
  display: flex;
  align-items: center;
  margin-top: 18px;
`

const IndexCell = styled(TableCell)`
  flex: 0 1 113px;
`

const ValueCell = styled(TableCell)`
  flex: 0 1 55px;
`

const ToggleCell = styled(TableCell)`
  flex: 0 1 59px;
`

const ActionCell = styled(TableCell)`
  flex: 0 1 72px;
  cursor: pointer;
  transition: color 0.2s ease;

  &:hover {
    color: var(--red);
  }
`

const Input = styled.input`
  width: 100%;
  border: none;
  box-sizing: border-box;
  background: var(--mainBackground);

  font-style: normal;
  font-weight: 600;
  font-size: 14px;
  line-height: 144%;

  color: var(--colorText);

  &::-webkit-input-placeholder {
    /* Chrome/Opera/Safari */
    opacity: 0.5;
  }
  &::-moz-placeholder {
    /* Firefox 19+ */
    opacity: 0.5;
  }
  &:-ms-input-placeholder {
    /* IE 10+ */
    opacity: 0.5;
  }
  &:-moz-placeholder {
    /* Firefox 18- */
    opacity: 0.5;
  }
`

const ErrorSVGSyled = styled(ErrorSVG)`
  margin-bottom: 16px;
`

const Buttons = styled.div`
  display: flex;
  flex-flow: row nowrap;
  margin-top: 83px;
`

const ButtonSure = styled(Button)`
  flex: 1 1 auto;
`

const ButtonCancel = styled(Button)`
  background: var(--red);
  flex: 1 1 auto;
  margin-left: 15px;

  &:hover {
    background: var(--red) !important;
  }
`

export default BookmarksPage
