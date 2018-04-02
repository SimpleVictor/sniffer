import * as React from 'react'
import { CSSConstant } from '../../constant/cssNames';

const GlobalHeaderModal = (props) => {
  return(
    <div id={CSSConstant.globalHeaderModalID} className='ui mini modal'>
      <div className='header global-header-modal-header__div'>Add Your Global Headers</div>
        <div className={`content global-header-modal-content__div`}>
          <div className='ui action input'>
          <h1>Some Content</h1>
        </div>
      </div>
    </div>
  )
}

export default GlobalHeaderModal
