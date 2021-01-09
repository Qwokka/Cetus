import React, { useEffect, useState } from 'react'
import styled from 'styled-components'
import { CSSTransition } from 'react-transition-group'

const Modal = ({ children, onClose }) => {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

  return (
    <Wrapper>
      <Overlay onClick={onClose} />
      <CSSTransition in={isMounted} timeout={500} classNames="slideDown">
        <Content>
          <Header>
            <Close onClick={onClose}>+</Close>
          </Header>
          <Body>{children}</Body>
        </Content>
      </CSSTransition>
    </Wrapper>
  )
}

export default Modal

const Wrapper = styled.div`
  height: 100vh;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-end;
  overflow: hidden;

  .slideDown-enter {
    transform: translateY(105%);
  }

  .slideDown-enter-active {
    transform: translateY(0);
    transition: transform 0.5s ease;
  }

  .slideDown-exit {
    transform: translateY(0);
  }

  .slideDown-exit-active {
    transform: translateY(105%);
    transition: transform 0.5s ease;
  }

  .slideDown-enter-done {
    transform: translateY(0);
  }
`

const Overlay = styled.div`
  background: rgba(0, 0, 0, 0.4);
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: 1;
`

const Content = styled.div`
  background: var(--mainBackground);
  z-index: 2;
  transform: translateY(105%);
`

const Header = styled.div`
  padding: 16px 35px;
  flex: 1 1 auto;
  position: relative;
`

const Close = styled.div`
  cursor: pointer;
  font-size: 31px;
  display: inline-block;
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%) rotate(45deg);
  opacity: 0.7;
  transition: opacity 0.2s ease;
  &:hover {
    opacity: 1;
  }
`

const Body = styled.div`
  flex: 1 1 auto;
  padding: 35px;
  text-align: center;
  overflow-y: auto;
  max-height: 100%;
`
