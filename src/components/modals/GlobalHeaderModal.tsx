import * as React from 'react'
import { CSSConstant } from '../../constant/cssNames';

type globalHeaderProperties = {
  readonly globalHeaders: any[];
  readonly SetGlobalHeadersAction: (payload) => {}
}

const GlobalHeaderModal = (props: globalHeaderProperties) => {

  const saveResponse = () => {
    console.log("khdxsf");
  }

  const renderList = () => {
    if(props.globalHeaders && props.globalHeaders.length) {
      return(
        <div className="container">
          {
            props.globalHeaders.map((header) => (
              <div className="row sector">
                <div className="six columns">
                  <input className="global-header-modal-pre-existing__input" type="text" value={header.headerKey}/>
                </div>
                <div className="six columns">
                  <input className="global-header-modal-pre-existing__input" type="text" value={header.headerValue}/>
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
            <input className="global-header-modal__input" type="text" name="keyK" />
          </label>
          <label>
            Value
            <input className="global-header-modal__input" type="text" name="valueK" />
          </label>
          <button
            onClick={() => saveResponse()}
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
