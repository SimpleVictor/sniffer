import * as React from 'react'
import ReactJson from 'react-json-view'
import {
  closeModal,
  currentRequestSelector,
  DeepClone,
  OpenDeleteModal,
  OpenEditModal, openErrorToast, openToast,
  setUpEditModalForCM,
  updateMockResponse,
  updateUrlAndStatus
} from '../utils/common'
import { Component } from 'react'

class JsonEditorModal extends Component {

  private currentResponse: any

  constructor(public props) {
    super(props)
  }

  componentDidUpdate() {
    /* TODO find a better way to update values inside of input */
    /* Where we update the url/status input, we needed to use the document obj to supply the value for the inputs */
    updateUrlAndStatus(this.props, 'JsonEditorModal') /* TODO find a better way to update values inside of input */
  }

  private isRequestInViewNull = requestInView => requestInView !== null

  private setCurrentResponseUrl = newUrl => this.currentResponse.urlToMatch = newUrl

  private setCurrentResponseStatusCode = newStatus => this.currentResponse.status = newStatus

  private setCurrentHeaders = (val) => {
    console.log(val)
  }

  private setCurrentResponse = val => this.currentResponse.response = val

  private onAdd = val => this.setCurrentResponse(val.updated_src)

  private onEdit = val => this.setCurrentResponse(val.updated_src)

  private onDelete = val => this.setCurrentResponse(val.updated_src)

  private deleteResponse = () => OpenDeleteModal()

  private onPasteJsonButtonClicked = async props => {
    setUpEditModalForCM(props)
    /* TODO The CodeMirror isn't initializing as fast as I want. Find a better solution than this */
    OpenEditModal(props)
  }

  private saveResponse = () => {
    /* TODO: right now we are only handeling JSON files */
    updateMockResponse(this.props, 'JsonEditorModal', this.currentResponse.response, this.currentResponse.headers)
    openToast('Successfully saved your collection')
    closeModal('#json-editor-modal')
  }

  private getCurrentSelectedResponse = props => this.isRequestInViewNull(props.requestInView)
    ? currentRequestSelector(props.savedRequests, props.groupInView, props.requestInView)
    : {};

  private renderJsonEditor = (response) => (
    <ReactJson
      src={response}
      name={false}
      indentWidth='2'
      theme='monokai'
      onAdd={val => this.onAdd(val)}
      onEdit={val => this.onEdit(val)}
      onDelete={val => this.onDelete(val)} />)

  private renderUrlInput = () => (
    <input
      id='jsonEditorModalUrlInput'
      className='edit-modal-input-field__input json-editor-modal-url__input'
      type='text'
      onChange={event  => this.setCurrentResponseUrl(event.target.value)}/>)

  private renderStatusInput = () => (
    <input
      id='jsonEditorModalStatusInput'
      className='edit-modal-input-field__input edit-modal-input-field__input--status'
      type='text'
      onChange={event  => this.setCurrentResponseStatusCode(event.target.value)}/>)

  private renderSaveButton = () => (
    <button
      onClick={() => this.saveResponse()}
      className='ui fluid inverted green button json-editor-save__button'>
      Save
    </button>)

  private renderDeleteButton = () => (
    <button
      onClick={() => this.deleteResponse()}
      className='ui fluid inverted red button json-editor-delete__button'>
      Delete
    </button>)

  private renderActionButton = () => (
    <div className='edit-modal-button-container__div'>
      {this.renderSaveButton()}
      {this.renderDeleteButton()}
    </div>)

  private renderPasteJsonButton = () => (
    <button
      onClick={() => this.onPasteJsonButtonClicked(this.props)}
      className='ui inverted blue button json-edit-modal-paste__button'>
      Paste Your Json
    </button>)

  private renderCloseButton = () => (
    <div
      onClick={() => closeModal('#json-editor-modal')}
      className='editor-close-container__div'>
      <i className='fa fa-times fa-5x editor-close__button' />
    </div>)

  private renderHeaderInputs = (props, headers = []) => {
    const renderHeaders = () => {
      return headers.map((data, idx) => (
        <tr key={data.key + idx} className='json-editor-modal__tr'>
          <td className='json-editor-modal__td json-editor-modal__td--key'>{data.key}</td>
          <td className='json-editor-modal__td json-editor-modal__td--value'>
            <input
              className='json-editor-header__input'
              type='text'
              defaultValue={data.value}
              onChange={event  => this.setCurrentHeaders(event.target.value)}/>
          </td>
          <td className='json-editor-modal__td' onClick={() => this.deleteHeaderValues(idx)}>
            <i
              className='fa fa-trash-alt fa-2x json-editor-header-trash__icon'/>
          </td>
        </tr>
        )
      )
    }

    return (
      <table className='json-editor-modal__table'>
        <tbody>
          <tr className='json-editor-modal__tr'>
            <td className='json-editor-modal__td'>Key</td>
            <td className='json-editor-modal__td'>Value</td>
          </tr>
          {renderHeaders()}
        </tbody>
      </table>
    )
  }

  private addNewHeaderValues = () => {
    const key = (document as any).getElementById('new-header-key').value;
    const value = (document as any).getElementById('new-header-value').value;
    if(key && value) {
      (document as any).getElementById('new-header-key').value = '';
      (document as any).getElementById('new-header-value').value = '';
      this.currentResponse.headers.push({
        key,
        value
      })
      updateMockResponse(this.props, 'JsonEditorModal', this.currentResponse.response, this.currentResponse.headers)
      openToast('Successfully saved your headers')
    }else {
      openErrorToast('Cannot submit empty values')
    }
  }

  private deleteHeaderValues = (idx) => {
    this.currentResponse.headers.splice(idx, 1);
    updateMockResponse(this.props, 'JsonEditorModal', this.currentResponse.response, this.currentResponse.headers)
    openToast('Successfully deleted the selected header content')
  }

  private renderAdditionalHeadersInputs = () => {
    return (
      <table className='json-editor-modal__table'>
        <tbody>
        <tr className='json-editor-modal__tr'>
          <td className='json-editor-modal__td json-editor-modal__td--key'>
            <input id='new-header-key' className='json-editor-header__input' type='text'/>
          </td>
          <td className='json-editor-modal__td json-editor-modal__td--value'>
            <input id='new-header-value' className='json-editor-header__input' type='text'/>
          </td>
          <td className='json-editor-modal__td' onClick={() => this.addNewHeaderValues()}>
            <i className='fa fa-plus fa-2x json-editor-header-add__icon'/>
          </td>
        </tr>
        </tbody>
      </table>
    )
  }

  render() {
    this.currentResponse = DeepClone(this.getCurrentSelectedResponse(this.props))
    const response = this.currentResponse && this.currentResponse.response ? DeepClone(this.currentResponse).response : {};
    return (
      <div id='json-editor-modal' className='ui basic modal'>

        {/*MODAL HEADER*/}
        <div className='json-editor-modal-header__div'>
          <div className='json-editor-modal-header-title__div'>Edit Collection</div>
          {this.renderCloseButton()}
          {this.renderActionButton()}
        </div>

        {/*SEPARATOR BETWEEN HEADER AND CONTENT*/}
        <hr className='json-editor-modal__hr'/>

        {/*STATUS CODE INPUT FIELD*/}
        <div className='ui massive input edit-modal-massive-input__div edit-modal-massive-input__div--status'>
          {this.renderStatusInput()}
          <label className="edit-modal-massive-input__label">Status Code</label>
        </div>

        {/*URL TO MATCH INPUT FIELD*/}
        <div className='ui massive input edit-modal-massive-input__div'>
          {this.renderUrlInput()}
          <label className="edit-modal-massive-input__label">Url</label>
        </div>

        <hr className='json-editor-modal__hr'/>

        {/* CUSTOM HEADERS */}
        {this.currentResponse ? this.renderHeaderInputs(this.props, this.currentResponse.headers) : ''}
        {this.renderAdditionalHeadersInputs()}

        <hr className='json-editor-modal__hr'/>

        {/*<AddCustomHeaderComponent*/}
          {/*savedRequests={this.props.savedRequests}*/}
          {/*groupInView={this.props.groupInView}*/}
          {/*requestInView={this.props.requestInView}/>*/}

        {/*PASTE JSON BUTTON*/}
        {this.renderPasteJsonButton()}

        {/*JSON EDITOR*/}
        {this.renderJsonEditor(response)}
      </div>
    )}
}

export default JsonEditorModal