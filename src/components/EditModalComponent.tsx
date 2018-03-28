import * as React from 'react'
import { Component } from 'react'
import { getCM } from '../CodeMirror'
import {
  EmitGlobalErrorMessage, hideEditModal,
  isValidJSON,
  updateMockResponse,
  updateUrlAndStatus
} from '../utils/common'

/* TODO use arrow functions inside of the class methods */
class EditModalComponent extends Component {
  constructor(public props){
    super(props)
  }

  private saveButtonClicked = (props, saveForm, UpdateResponseThenCloseModal) =>
    saveForm(props, UpdateResponseThenCloseModal)

  private renderEditModalHeader = (props, saveButtonClicked, saveForm, UpdateResponseThenCloseModal) => (
    <div className='header'>
      Edit Current Interceptor
      <button
        className='ui blue button save-button'
        onClick={() => saveButtonClicked(props, saveForm, UpdateResponseThenCloseModal)}>
        Save
      </button>
    </div>)

  private renderUrlInput = () => (
    <div className='ui labeled input'>
      <div className='ui label'>url</div>
      <input id='editModalUrlInput' type='text' className='edit-modal-url-field__input'/>
    </div>)

  private renderStatusInput = () => (
    <div className='ui labeled input'>
      <div className='ui label'>status</div>
      <input id='editModalStatusInput' type='text'/>
    </div>)

  private renderErrorMessage = props =>
    <p className={`edit-modal-error-message ${!props.editModalErrorMessage ? 'hide' : ''}`}>{props.editModalErrorMessage}</p>

  private renderResponseTextArea = () => (
      <div className='ui form'>
        <div className='field'>
          <label>Text</label>
          <textarea id='my-edit-textarea' className='edit-modal-text-area'></textarea>
        </div>
      </div>)

  private renderEditModalCloseButton = () => (
      <button className='ui red fluid button edit-modal-close__button' onClick={() => hideEditModal()}>Close</button>)

  private renderEditModalContent = props => (
      <div className='scrolling content'>
        {this.renderErrorMessage(props)}
        {this.renderStatusInput()}
        {this.renderUrlInput()}
        {this.renderResponseTextArea()}
        {this.renderEditModalCloseButton()}
      </div>)

  private saveForm = (props, UpdateResponseThenCloseModal) => {
    isValidJSON(getCM().getValue())
      ? UpdateResponseThenCloseModal(props)
      : EmitGlobalErrorMessage(
        'Currently we are only supporting mocking JSONs. If you know that already then there\'s something wrong with your JSON. Please correct it!',
        props.ErrorMessageEditModalAction
      )}

  /* TODO: right now we are only handeling JSON files */
  private UpdateResponseThenCloseModal = props => {
    updateMockResponse(props, 'EditModalComponent', JSON.parse(getCM().getValue()))
    hideEditModal()}

  componentDidUpdate() {
    updateUrlAndStatus(this.props, 'EditModalComponent')
  }

  render() {
    return (
      <div className='ui modal edit-modal'>
        {this.renderEditModalHeader(this.props, this.saveButtonClicked, this.saveForm, this.UpdateResponseThenCloseModal)}
        {this.renderEditModalContent(this.props)}
      </div>
    )}
}

export default EditModalComponent