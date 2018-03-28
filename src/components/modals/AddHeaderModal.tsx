import * as React from 'react';

const AddHeaderModal = props => {
  return (
    <div id='add-header-modal' className='ui small modal header-modal'>
      <div className='header delete-modal-header__div'>Add Header</div>
      <div className='content delete-modal-content__div'>
        <div className='ui fluid red button delete-modal-content__button'>Do it!</div>
      </div>
    </div>)
}

export default AddHeaderModal

