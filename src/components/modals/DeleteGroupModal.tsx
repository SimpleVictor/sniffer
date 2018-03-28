import * as React from 'react';
import {
  DeepClone,
  hideDeleteGroupModal,
  openToast
} from '../../utils/common';
import { getSocket } from '../../utils/sockets';

const DeleteGroupModal = props => {

  const deleteResponse = props => {
    const newSavedRequest = DeepClone(props.savedRequests);
    newSavedRequest.splice(props.groupInView, 1);
    props.GroupsInViewAction(props.groupInView - 1 < 0 ? 0 : (props.groupInView - 1));
    getSocket().emit('SetSavedRequests', JSON.stringify(newSavedRequest));
    openToast(`Succesfully deleted ${props.savedRequests[props.groupInView].group}`);
    hideDeleteGroupModal()
  }

  const renderDeleteModalContent = props => (
    <div className='content delete-modal-content__div'>
      <div className='ui fluid red button delete-modal-content__button' onClick={() => deleteResponse(props)}>Do it!</div>
    </div>)

  const renderDeleteModalHeader = () => (<div className='header delete-modal-header__div'>Last chance to back out</div>)

  return (
    <div id='delete-group-modal' className='ui small modal delete-modal'>
      {renderDeleteModalHeader()}
      {renderDeleteModalContent(props)}
    </div>)
}

export default DeleteGroupModal

