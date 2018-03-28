import * as React from 'react';
import { getSocket } from '../utils/sockets';
import {
  DeepClone,
  hideDeleteModal, openToast
} from '../utils/common';

const DeleteModalComponent = props => {

  const deleteResponse = props => {
    const {
      allRequest,
      groupInView,
      requestInView,
      RequestInViewAction
    } = props
    const TotalRequest = DeepClone(allRequest)
    TotalRequest[groupInView].data.splice(requestInView, 1)
    RequestInViewAction(null)
    hideDeleteModal()
    openToast("Successfully deleted a collection.")
    getSocket().emit('SetSavedRequests', JSON.stringify(TotalRequest))
  }

  const renderDeleteModalContent = props => (
    <div className='content delete-modal-content__div'>
      <div className='ui fluid red button delete-modal-content__button' onClick={() => deleteResponse(props)}>Do it!</div>
    </div>)

  const renderDeleteModalHeader = () => (<div className='header delete-modal-header__div'>Last chance to back out</div>)

  return (
    <div id='delete-modal' className='ui small modal delete-modal'>
      {renderDeleteModalHeader()}
      {renderDeleteModalContent(props)}
    </div>)
}

export default DeleteModalComponent

