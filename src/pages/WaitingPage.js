import React from 'react'
import styled from 'styled-components'

import { Title } from '~/components/Common/CommonStyled'

const WaitingPage = () => (
  <Wrapper>
    <Title>Waiting for WASM...</Title>
  </Wrapper>
)

const Wrapper = styled.div`
  color: var(--colorText);
  display: flex;
  flex-flow: column nowrap;
  justify-content: center;
  align-items: center;
  height: 100%;
`

export default WaitingPage
