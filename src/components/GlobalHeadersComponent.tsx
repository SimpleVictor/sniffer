import * as React from 'react'
import { openModal } from '../utils/common'
import { CSSConstant } from '../constant/cssNames'
import GlobalHeaderModal from "./modals/GlobalHeaderModal";

const GlobalHeadersComponent = props => {
  const openGlobalHeaderModal = () =>
    props.proxy === 'off'
    ? openModal(`#${CSSConstant.globalHeaderModalID}`)
    : openModal(`#${CSSConstant.proxyIsOnModalID}`);

  return (
    <div className='global-header-component__div'>
      <a
        className='global-header-component__a'
        onClick={openGlobalHeaderModal}>
        Global Headers
      </a>

      <GlobalHeaderModal
        globalHeaders={props.globalHeaders}
        SetGlobalHeadersAction={props.SetGlobalHeadersAction}/>

    </div>
  )
}

export default GlobalHeadersComponent
