import * as React from 'react'
import { CSSConstant } from '../../constant/cssNames';

type globalHeaderProperties = {
  readonly globalHeaders: any[];
  readonly SetGlobalHeadersAction: (payload) => {}
}

const GlobalHeaderModal = (props: globalHeaderProperties) => {
  return(
    <div id={CSSConstant.globalHeaderModalID} className='ui mini modal'>
      <div className='header global-header-modal-header__div'>Add Your Global Headers</div>
        <div className={`content global-header-modal-content__div`}>
          <div className='ui action input'>
          {props.globalHeaders.map((e) => (
            <h3>{e.headerKey} : {e.headerValue}</h3>
          ))}
        </div>
      </div>
    </div>
  )
}

export default GlobalHeaderModal
