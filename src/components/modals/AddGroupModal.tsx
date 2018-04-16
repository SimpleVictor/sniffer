import * as React from 'react'
import { CSSConstant } from '../../constant/cssNames';
import {
  AddEmptyGroupToMockJSON,
  closeModal,
  ElementSelector, openToast
} from '../../utils/common'

const AddGroupModal = props => {
  const AddGroupButtonClicked = () => {
    const inputValue = ElementSelector(`#${CSSConstant.addGroupModalInput}`).value;
    AddEmptyGroupToMockJSON(props, inputValue)
    closeModal(`#${CSSConstant.addGroupModalDiv}`)
    /* TODO this would break if there's no group at all. We would try to reference a non existent group property */
    openToast(`Successfully added a new group: ${inputValue}`)
  }

  const renderCloseButton = () => (
    <div
      onClick={() => closeModal(`#${CSSConstant.addGroupModalDiv}`)}
      className='add-group-modal-close-container__div'>
      <span className='add-group-modal-close-container__span'>
        <i className='fa fa-times fa-5x add-group-modal-close__button' />
      </span>
    </div>);

  const renderGroupNameBlock = () => (
    <div className='add-group-modal-section__div'>
      <div className='add-group-modal-section-header__div'>Group Name</div>
      <div className='add-group-modal-section-content__div'>
        <input id={CSSConstant.addGroupModalInput} className="add-group-modal-group-name__input" type="text"/>
      </div>
    </div>
  )

  const renderDescriptionBlock = () => (
    <div className='add-group-modal-section__div'>
      <div className='add-group-modal-section-header__div'>Description</div>
      <div className='add-group-modal-section-content__div'>
        <input id={CSSConstant.addDescriptionModalInput} className="add-group-modal-group-name__input" type="text"/>
      </div>
    </div>
  )

  const renderRequestResponseBlock = () => (
    <div className='add-group-modal-section__div'>
      <div className='add-group-modal-section-header__div'>Requests / Responses</div>
      <div className='add-group-modal-section-content__div'>Stealing Content Here</div>
    </div>
  )

  const renderButtonBlock = () => (
    <button className='ui button add-group-modal-content__button' onClick={AddGroupButtonClicked}>Add</button>
  )

  return(
    <div id={CSSConstant.addGroupModalDiv} className='ui basic modal add-group-modal-container__div'>

      {renderCloseButton()}

      <h1 className='add-group-modal-header_h1'>New Group</h1>

      <div className='add-group-modal__container'>
        {renderGroupNameBlock()}
        {renderDescriptionBlock()}
        {renderRequestResponseBlock()}
        {renderButtonBlock()}
      </div>

      {/*<div className='header add-group-modal-header__div'>What is the name of your group</div>*/}
      {/*<div className={`content ${CSSConstant.addGroupModalContentDiv}`}>*/}
        {/*<div className='ui action input'>*/}
          {/*<input className={CSSConstant.addGroupModalInput} type='text' placeholder='Canadian User...'/>*/}
          {/*<button className='ui button add-group-modal-content__button' onClick={AddGroupButtonClicked}>Add</button>*/}
        {/*</div>*/}
      {/*</div>*/}



    </div>
  )
}

export default AddGroupModal
