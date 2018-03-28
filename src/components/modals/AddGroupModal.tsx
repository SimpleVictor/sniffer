import * as React from 'react'
import { CSSConstant } from '../../constant/cssNames';
import {
  AddEmptyGroupToMockJSON,
  closeModal,
  ElementSelector, openToast
} from '../../utils/common'

const AddGroupModal = props => {
  const AddGroupButtonClicked = () => {
    const inputValue = ElementSelector(`.${CSSConstant.addGroupModalInput}`).value
    AddEmptyGroupToMockJSON(props, inputValue)
    closeModal(`#${CSSConstant.addGroupModalDiv}`)
    /* TODO this would break if there's no group at all. We would try to reference a non existent group property */
    openToast(`Successfully added a new group: ${inputValue}`)
  }
  return(
    <div id={CSSConstant.addGroupModalDiv} className='ui mini modal'>
      <div className='header add-group-modal-header__div'>What's the name of your group</div>
      <div className={`content ${CSSConstant.addGroupModalContentDiv}`}>
        <div className='ui action input'>
          <input className={CSSConstant.addGroupModalInput} type='text' placeholder='Canadian User...'/>
          <button className='ui button add-group-modal-content__button' onClick={AddGroupButtonClicked}>Add</button>
        </div>
      </div>
    </div>
  )
}

export default AddGroupModal
