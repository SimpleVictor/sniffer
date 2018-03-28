import * as React from 'react'

const ProxyIsOnModal = props => {
  return(
    <div id="proxyIsOnModal" className='ui mini modal'>
      <div className='content proxy-is-on-modal__div'>
        <div className="proxy-is-on-modal-first__div">You can not edit while</div>
        <div className="proxy-is-on-modal-third__div">proxy is on</div>
      </div>
    </div>
  )
}

export default ProxyIsOnModal
