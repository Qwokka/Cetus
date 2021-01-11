import React, { useEffect, useState, useMemo } from 'react'
import styled from 'styled-components'
import Slider from 'rc-slider'

import { Button } from '~/components/Common/CommonStyled'

import Speedometer from '~/components/Speedometr'
import SpeedometerArrow from '~/components/assets/speedometer-arrow.svg'

import 'rc-slider/assets/index.css'

const DEFAULT_SH_VALUE = 2

const marks = Array.from(Array(11).keys()).reduce((acc, number) => {
  acc[number] = number
  return acc
}, {})

const SpeedhackPage = ({ speedhack, multiplier, toggleSpeedhack }) => {
  const [currentShValue, setShValue] = useState(multiplier !== null ? multiplier : DEFAULT_SH_VALUE)

  const handleRangeChange = (val) => setShValue(val)

  const arrowTransformStyle = useMemo(
    () => ({
      transform: `translate(0px, -157px) rotate(${Math.floor(currentShValue - 5) * 22}deg)`,
    }),
    [currentShValue]
  )

  useEffect(() => {
    const stripesValue = Math.floor(currentShValue * 22) / 3.5
    const boldStripesValue = Math.floor(currentShValue * 22)

    const boldStripes = document.getElementsByClassName('paint-bold')
    const processedBoldStripes = Object.keys(boldStripes)

    const stripes = document.getElementsByClassName('paint')
    const processedStripes = Object.keys(stripes)

    processedStripes.forEach((index, value) => {
      if (index <= stripesValue) {
        stripes[index].style.fill = '#5352ED'
      } else {
        stripes[index].style.fill = '#2A303E'
      }
    })

    processedBoldStripes.forEach((index, value) => {
      if (index <= boldStripesValue / 20) {
        boldStripes[index].style.fill = '#5352ED'
      } else {
        boldStripes[index].style.fill = '#2A303E'
      }
    })
  }, [currentShValue])

  return (
    <Wrapper>
      <SpeedometerWrapper>
        <Speedometer />
        <SpeedhackValue>{currentShValue}x</SpeedhackValue>
        <SpeedometerArrowIcon id="arrow" style={arrowTransformStyle} />
      </SpeedometerWrapper>

      <SliderWrapper>
        <Slider
          defaultValue={currentShValue}
          dots={true}
          min={0}
          max={10}
          marks={marks}
          onChange={handleRangeChange}
          railStyle={{ height: 3 }}
          dotStyle={{ width: 2, height: 7 }}
          trackStyle={{ height: 3 }}
        />
      </SliderWrapper>
      <ButtonSh onClick={() => toggleSpeedhack(currentShValue)}>
        {speedhack.enabled ? 'Disable speedhack' : 'Enable speedhack'}
      </ButtonSh>
    </Wrapper>
  )
}

const Wrapper = styled.div`
  padding: 30px 0;
  color: var(--colorText);
`

const SpeedometerWrapper = styled.div`
  position: relative;
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
`

const SpeedhackValue = styled.div`
  font-style: normal;
  font-weight: bold;
  font-size: 60px;
  line-height: 144%;
  color: #dbdbdb;
  user-select: none;

  position: absolute;
  top: 55%;
  left: 50%;
  transform: translate(-50%, -50%);
`

const SpeedometerArrowIcon = styled(SpeedometerArrow)`
  transform: translate(0px, -157px) rotate(-67.8deg);
  transform-origin: 50% 100px;
  transition: transform 0.2s ease;
  will-change: transform;
`

const SliderWrapper = styled.div`
  position: relative;
  margin-top: 40px;
  padding: 0 7px;

  .rc-slider-rail {
    background-color: var(--rangeInputInactive);
  }

  .rc-slider-track {
    background-color: var(--purple);
  }

  .rc-slider-step {
    height: 3px;
  }

  .rc-slider-dot {
    background-color: var(--rangeInputInactive);
    border-radius: 4px;
    border: none;

    &-active {
      background-color: var(--purple);
    }

    &:first-child,
    &:last-child {
      display: none;
    }
  }

  .rc-slider-handle {
    border: 1px solid var(--purpleBorder);
    background-color: var(--rangeDotBackground);
    width: 16px;
    height: 16px;
    transform: translateX(-60%);
    margin-top: -7px;
    outline: none;

    &:active {
      border-color: var(--activeColor);
      box-shadow: 0 0 5px var(--activeColor);
    }

    &:hover {
      border-color: var(--activeColor);
    }

    &-click-focused:focus {
      border-color: var(--activeColor);
    }
  }

  .rc-slider-mark {
    top: -7px;
    font-size: 11px;
    transform: translateY(-100%);
    height: 12px;
  }

  .rc-slider-mark-text {
    transform: translateX(-100%) !important;
  }
`

const ButtonSh = styled(Button)`
  margin-top: 32px;
`

export default SpeedhackPage
