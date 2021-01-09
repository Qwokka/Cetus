import React, { useCallback, useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import { useDispatch, useSelector } from 'react-redux'
import Editor from 'react-simple-code-editor'
import Prism from 'prismjs'

import { savePatch } from '~/store/patches/patchesReducer'
import { searchFunction, searchResultGetter } from '~/store/patches/patchesReducer'

import { Label, Button, Input } from '~/components/Common/CommonStyled'

const PatchPage = () => {
  const [currentPatch, setPatch] = useState('')
  const [funcIndex, setFuncIndex] = useState(null)
  const dispatch = useDispatch()
  const searchResult = useSelector(searchResultGetter)

  const fileHandler = useCallback((e) => {
    const fileReader = new FileReader();
    fileReader.readAsText(e.currentTarget.files[0], "UTF-8");

    // TODO Handle file upload error
    fileReader.onload = function(e) {
      const fileContents = e.target.result;
      let patchObj;

      try {
        patchObj = JSON.parse(fileContents);
        setPatch(fileContents)
      } catch (err) {
        // TODO Alert user on JSON parse error
        throw new Error(err);
      } finally {
        if (typeof patchObj.name !== "string" ||
           typeof patchObj.index !== "string" ||
           typeof patchObj.url !== "string" ||
           !(patchObj.bytes instanceof Array)) {
              // TODO Alert user on bad format error
              throw new Error('Bad patch format');
        }
        dispatch(savePatch(patchObj))
      }
    }
  }, [currentPatch, dispatch, setPatch])

  const submitQueryFunction = useCallback((e) => {
    e.preventDefault()
    console.log('func index', funcIndex)
    dispatch(searchFunction(funcIndex))
  }, [funcIndex, dispatch])

  console.log('search result', searchResult)

  return (
    <Wrapper>
      <FindForm onSubmit={submitQueryFunction}>
        <InputWrapper>
          <Label htmlFor="searchFunc">Search for functions</Label>
          <Input id="searchFunc" type="text" value={funcIndex} onChange={e => setFuncIndex(e.currentTarget.value)} />
        </InputWrapper>
        <SumbitButton type="submit">Start searching</SumbitButton>
      </FindForm>

      <PatchActions>
        <MinimalButton>Save</MinimalButton>
        <MinimalButton>Load</MinimalButton>
        <MinimalButton as="label" htmlFor="importPatch">
          Import
          <input type="file" class="hidden" id="importPatch" onChange={fileHandler} />
        </MinimalButton>
      </PatchActions>

      <PrismWrapper htmlFor="prismEditor">
        <Editor 
          value={currentPatch}
          onValueChange={code => setPatch(code)}
          highlight={code => Prism.highlight(code, Prism.languages.js)}
          textareaId="prismEditor"
          textareaClassName="patchEditor"
          style={{
            fontFamily: '"Fira code", "Fira Mono", monospace',
            fontSize: 14,
          }}
        />
      </PrismWrapper>
    </Wrapper>
  )
}
const Wrapper = styled.div`
  color: var(--colorText);
`

const FindForm = styled.form`
  margin-top: 20px;
`

const InputWrapper = styled.div``

const SumbitButton = styled(Button)`
  margin-top: 25px;
`

const PatchActions = styled.div`
  display: flex;
  margin-top: 36px;
`

const MinimalButton = styled.div`
  cursor: pointer;
  transition: color .2s ease;
  font-size: 13px;

  &:not(:first-child) {
    margin-left: 10px;
  }

  &:hover {
    color: var(--activeColor);
  }

  .hidden {
    display: none;
  }
`

const PrismWrapper = styled.label`
  display: block;
  padding: 18px 50px 50px 50px;
  border: 1px solid #8e8e93;
  border-radius: 5px;
  margin-top: 15px;
  cursor: text;
`

export default PatchPage
