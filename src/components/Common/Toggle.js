import React from 'react'
import styled from 'styled-components'

const ToggleComponent = ({ isActive, changeHandler }) => (
  <ToggleBackground onClick={() => changeHandler(isActive)}>
    <Toggle isActive={isActive} />
  </ToggleBackground>
)

const ToggleBackground = styled.div`
  position: relative;
  width: 34px;
  height: 14px;
  background: #8e8e9338;
  border-radius: 7px;
  cursor: pointer;
`

const Toggle = styled.div`
  position: absolute;
  left: 0;
  top: 50%;
  transform: ${({ isActive }) => (isActive ? 'translate3d(70%, -50%, 0)' : 'translateY(-50%)')};
  width: 20px;
  height: 20px;
  min-width: 20px;
  min-height: 20px;
  background: ${({ isActive }) => (isActive ? 'var(--activeColor)' : 'var(--white)')};
  transition: background 0.2s ease, transform 0.2s ease;
  border-radius: 50%;
`

export default ToggleComponent
