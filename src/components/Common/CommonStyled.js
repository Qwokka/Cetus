import styled from 'styled-components'

export const Title = styled.div`
  font-style: normal;
  font-weight: 600;
  font-size: 24px;
  line-height: 146.16%;
  letter-spacing: 0.02em;
  color: var(--colorText);
`

export const Description = styled.div`
  font-style: normal;
  font-weight: normal;
  font-size: 15px;
  line-height: 146.16%;
  letter-spacing: 0.02em;
  color: var(--colorText);
  opacity: 0.5;
`

export const Label = styled.div`
  font-style: normal;
  font-weight: normal;
  font-size: 13px;
  line-height: 146.16%;
  letter-spacing: 0.02em;
  color: var(--colorText);
  opacity: 0.5;
  margin-bottom: 7px;
`

export const TableCell = styled.div`
  color: var(--colorText);
  opacity: ${({ head }) => (head ? '.5' : '1')};
  font-style: normal;
  font-weight: normal;
  font-size: ${({ head }) => (head ? '13px' : '14px')};
`

export const Button = styled.div`
  background: ${({ background }) => (background ? background : 'var(--activeColor)')};
  color: #fff;
  box-sizing: border-box;
  border-radius: 5px;
  cursor: pointer;
  padding: var(--popupLayoutPadding);
  text-align: center;
  font-style: normal;
  font-weight: 600;
  font-size: 17px;
  line-height: 146.16%;
  transition: background 0.2s ease;

  &:hover {
    background: var(--purple);
  }
`

export const Input = styled.input`
  width: 100%;
  border: 1px solid #8e8e93;
  box-sizing: border-box;
  border-radius: 5px;
  background: var(--mainBackground);
  padding: 15px;
  outline: none;

  font-style: normal;
  font-weight: 600;
  font-size: 17px;
  line-height: 146.16%;
  letter-spacing: 0.02em;

  color: var(--colorText);

  transition: border-color 0.2s ease-out;

  &::-webkit-input-placeholder {
    /* Chrome/Opera/Safari */
    opacity: 0.5;
    transition: opacity 0.2s ease;
  }
  &::-moz-placeholder {
    /* Firefox 19+ */
    opacity: 0.5;
    transition: opacity 0.2s ease;
  }
  &:-ms-input-placeholder {
    /* IE 10+ */
    opacity: 0.5;
    transition: opacity 0.2s ease;
  }
  &:-moz-placeholder {
    /* Firefox 18- */
    opacity: 0.5;
    transition: opacity 0.2s ease;
  }

  &:focus {
    border-color: var(--purple);

    &::-webkit-input-placeholder {
      /* Chrome/Opera/Safari */
      opacity: 1;
    }
    &::-moz-placeholder {
      /* Firefox 19+ */
      opacity: 1;
    }
    &:-ms-input-placeholder {
      /* IE 10+ */
      opacity: 1;
    }
    &:-moz-placeholder {
      /* Firefox 18- */
      opacity: 1;
    }
  }
`
