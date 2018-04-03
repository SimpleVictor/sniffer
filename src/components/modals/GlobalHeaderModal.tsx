import * as React from 'react'
import { CSSConstant } from '../../constant/cssNames';
import {DeepClone, openErrorToast, openToast, closeModal} from "../../utils/common";
import {getSocket} from "../../utils/sockets";

type globalHeaderProperties = {
  readonly globalHeaders: any[];
  readonly SetGlobalHeadersAction: (payload) => {}
}

const GlobalHeaderModal = (props: globalHeaderProperties) => {

  const deleteHeader = (idx) => {
    const cloned = DeepClone(props.globalHeaders);
    cloned.splice(idx, 1);
    props.SetGlobalHeadersAction(cloned);
    openToast('Deleted Key!')
  }

  const addResponses = () => {
    const key = (document as any).getElementById('globalHeaderKeyID').value;
    const value = (document as any).getElementById('globalHeaderValueID').value;
    if ( key && value) {
      const cloned = DeepClone(props.globalHeaders);
      cloned.push({
        headerKey: key,
        headerValue: value
      });
      props.SetGlobalHeadersAction(cloned);
      (document as any).getElementById('globalHeaderKeyID').value = '';
      (document as any).getElementById('globalHeaderValueID').value = '';
      openToast('A new header key has been added!')
    } else {
      openErrorToast('Please fill all the key and value!')
    }
  }

  const saveResponse = () => {
    getSocket().emit('SetGlobalHeaders', JSON.stringify(props.globalHeaders));
    closeModal(`#${CSSConstant.globalHeaderModalID}`);
    openToast('Saved responses');
  }

  const renderList = () => {
    if(props.globalHeaders && props.globalHeaders.length) {
      return(
        <div className="container">
          {
            props.globalHeaders.map((header, idx) => (
              <div className="row sector">
                <div className="five columns">
                  <input className="global-header-modal-pre-existing__input" type="text" value={header.headerKey}/>
                </div>
                <div className="five columns">
                  <input className="global-header-modal-pre-existing__input" type="text" value={header.headerValue}/>
                </div>

                <div
                  className="two columns global-header-modal-custom-height"
                  onClick={() => deleteHeader(idx)}>
                    <i className='fa fa-trash-alt fa-2x global-header-modal-trash__icon'/>
                </div>
              </div>
            ))
          }
        </div>
      )
    }else {
      return (
        <p>You currently have no global headers set!</p>
      )
    }
  }

  return(
    <div id={CSSConstant.globalHeaderModalID} className='ui mini modal'>
      <div className='header global-header-modal-header__div'>Global Headers</div>
      <div className={`content global-header-modal-content__div`}>
        {renderList()}
        <hr/>
        <div className="global-header-add-header__container">
          <label>
            Key
            <input id="globalHeaderKeyID" className="global-header-modal__input" type="text" name="keyK" />
          </label>
          <label>
            Value
            <input id="globalHeaderValueID" className="global-header-modal__input" type="text" name="valueK" />
          </label>
          <button
            onClick={() => addResponses()}
            className='ui fluid inverted green button'>
            Add
          </button>
        </div>
        <hr/>
        <div className="global-header-save__container">
          <button
            onClick={() => saveResponse()}
            className='ui fluid blue button'>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

export default GlobalHeaderModal
