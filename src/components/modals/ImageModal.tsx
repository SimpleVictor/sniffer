import * as React from 'react';
import {
  closeModal, currentRequestSelector, DeepClone, ModalConstantID, OpenDeleteModal, openErrorToast, openToast,
  updateMockResponse,
  updateUrlAndStatus
} from '../../utils/common';
import { Component } from 'react';

class ImageModal extends Component {

  public currentResponse: any;

  constructor(public props) {
    super(props);
  }

  componentDidUpdate() {
    /* TODO find a better way to update values inside of input */
    /* Where we update the url/status input, we needed to use the document obj to supply the value for the inputs */
    updateUrlAndStatus(this.props, 'ImageModal') /* TODO find a better way to update values inside of input */
  }

  private setCurrentResponse = val => {
    if (!this.currentResponse.response) {
      this.currentResponse.response = {}
    }
    this.currentResponse.response.fileName = val
  }

  private setCurrentResponseUrl = newUrl => this.currentResponse.urlToMatch = newUrl;

  private renderCloseButton = () => (
    <div
      onClick={() => closeModal(`#${ModalConstantID.imageModal}`)}
      className='image-modal-close__div'>
      <i className='fa fa-times fa-5x image-modal-close__button'/>
    </div>);

  private renderStatusInput = () => (
    <input
      id='imageModalStatusInput'
      className='image-modal-input-field__input'
      type='text'
      placeholder='Status Code...'
      onChange={event  => this.setCurrentResponseStatusCode(event.target.value)}/>);

  private renderUrlInput = () => (
    <input
      id='imageModalUrlInput'
      className='image-modal-input-field__input image-modal-input-field__input--url'
      type='text'
      placeholder='Url'
      onChange={event  => this.setCurrentResponseUrl(event.target.value)}/>);

  private setCurrentResponseStatusCode = newStatus => this.currentResponse.status = newStatus;

  private isRequestInViewNull = requestInView => requestInView !== null;

  private deleteResponse = () => OpenDeleteModal();

  private getCurrentSelectedResponse = props => this.isRequestInViewNull(props.requestInView)
    ? currentRequestSelector(props.savedRequests, props.groupInView, props.requestInView)
    : {};

  private renderActionButton = () => (
    <div className='edit-modal-button-container__div'>
      {this.renderSaveButton()}
      {this.renderDeleteButton()}
    </div>)

  private saveResponse = () => {
    updateMockResponse(this.props, 'ImageModal', this.currentResponse.response, this.currentResponse.headers)
    openToast('Successfully saved your collection')
    closeModal(`#${ModalConstantID.imageModal}`)
  }

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

  private deleteHeaderValues = (idx) => {
    this.currentResponse.headers.splice(idx, 1);
    updateMockResponse(this.props, 'ImageModal', this.currentResponse.response, this.currentResponse.headers)
    openToast('Successfully deleted the selected header content')
  }

  private renderHeaderInputs = (props, headers = []) => {
    const renderHeaders = () => {
      return headers.map((data, idx) => (
          <tr key={data.key + idx} className='json-editor-modal__tr'>
            <td className='json-editor-modal__td json-editor-modal__td--key'>{data.key}</td>
            <td className='json-editor-modal__td json-editor-modal__td--value'>
              <input
                className='json-editor-header__input'
                type='text'
                defaultValue={data.value}/>
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
      updateMockResponse(this.props, 'ImageModal', this.currentResponse.response, this.currentResponse.headers)
      openToast('Successfully saved your headers')
    }else {
      openErrorToast('Cannot submit empty values')
    }
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

  private isImage = (contentType) => /png|jpg|jpeg|gif/g.test(contentType);

  private uploadHandler = () => {
    const myInput: any = document.getElementById('myfile-input');
    if(!myInput.files[0]) {
      openErrorToast("Brooo.. At least add something before submitting. This is why unhappy path exists...")
    }else if (!this.isImage(myInput.files[0].type)) {
      openErrorToast("Currently JPEG, JPG, PNG are supported. All other files will not be added.")
    } else {
      const formData = new FormData();
      formData.append('image', myInput.files[0]);
      fetch('http://localhost:2000/file-upload', {
        method: 'POST',
        body: formData
      }).then(response => response.json())
      .then((data: any) => {
        const id = data.fileName;
        this.setCurrentResponse(id);
        this.saveResponse();
      }).catch((err) => {
        console.log(err);
        openErrorToast('File upload failed. If upload fails then restart the Sniffer application.')
      });
    }
  }

  private renderImage = () => {
    if (this.currentResponse && this.currentResponse.response && this.currentResponse.response.fileName) {
      return (<img src={`http://localhost:2000/${this.currentResponse.response.fileName}`}></img>)
    }else {
      return (<h3>You have not yet imported any pictures =[</h3>)
    }
  }

  render() {
    this.currentResponse = DeepClone(this.getCurrentSelectedResponse(this.props));
    return (
      <div id={ModalConstantID.imageModal} className='ui basic modal'>
        <div className='image-modal-header__div'>
          <div className='image-modal-header-title__div'>Image Interceptor</div>
          {this.renderCloseButton()}
          {this.renderActionButton()}
        </div>

        <hr className='image-modal__hr'/>

        <div className='ui massive input image-modal-massive-input__div image-modal-massive-input__div--status'>
          {this.renderStatusInput()}
        </div>

        <div className='ui massive input image-modal-massive-input__div'>
          {this.renderUrlInput()}
        </div>

        <hr className='image-modal__hr'/>

        {/* CUSTOM HEADERS */}
        {this.currentResponse ? this.renderHeaderInputs(this.props, this.currentResponse.headers) : ''}
        {this.renderAdditionalHeadersInputs()}

        <hr className='image-modal__hr'/>

        <div className='image-modal-upload-image__div'>
          <input id="myfile-input" type="file"/>
          <button onClick={() => this.uploadHandler()}>Upload!</button>

          <br/>
          { this.renderImage() }
        </div>


      </div>)
  }
}

export default ImageModal

