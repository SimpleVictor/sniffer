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

  const renderList = props => {
    if (props.globalHeaders && props.globalHeaders.length) {
      return (
        <div>
          {
            props.globalHeaders.map((header, idx) => (
              <div className="global-header-list-container" key={header.headerKey+(idx + 1)}>
                <section className="global-header-list-section global-header-list-section--right">
                  <input className="global-header-modal-pre-existing__input" type="text" defaultValue={header.headerKey}/>
                </section>

                <section className="global-header-list-section">
                  <input className="global-header-modal-pre-existing__input" type="text" defaultValue={header.headerValue}/>
                </section>

                <div
                  className="global-header-modal-custom-height"
                  onClick={() => deleteHeader(idx)}>
                  <i className='fas fa-trash-alt fa-2x global-header-modal-trash__icon'/>
                </div>

              </div>
            ))
          }
        </div>
      )
    } else {
      return (
        <section>
          <i className='fas fa-battery-empty fa-5x global-header-modal-meh__icon'/>
          <p className='global-header__p'>You Have None...</p>
        </section>
      )
    }
  }

  return (
    <div id={CSSConstant.globalHeaderModalID} className='ui mini modal'>
      <div className='header global-header-modal-header__div'>Global Headers</div>
      <div className={`content global-header-modal-content__div`}>

        <div className='global-header-modal-container'>

          <section className="global-header-add-arrow__container" onClick={() => addResponses()}>
            <i className="fa fa-chevron-circle-right fa-5x global-header-add-arrow__icon"></i>
          </section>

          <section className='global-header-modal-flex-section global-header-modal-flex-section--right global-header-modal-add-header-container'>

            <p className='global-header-left-title'>Add Headers</p>

            <input id="globalHeaderKeyID" className="global-header-modal__input" type="text"/>
            <label className="global-header-modal__label">Key</label>

            <section className='global-header-spacer__section'></section>

            <input id="globalHeaderValueID" className="global-header-modal__input" type="text"/>
            <label className="global-header-modal__label">Value</label>

          </section>



          <section className='global-header-modal-flex-section'>
            <p className='global-header-right-title'>Header List</p>
            {renderList(props)}
          </section>
        </div>

        <hr className='global-header__hr'/>

        <div className="global-header-save__container">
          <button
            onClick={() => saveResponse()}
            className='ui fluid button global-header-save-button'>
            Save
          </button>
        </div>

      </div>

    </div>
  )
}

export default GlobalHeaderModal
