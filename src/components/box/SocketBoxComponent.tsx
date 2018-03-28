import * as React from 'react';
import { StartSocketListener } from '../../utils/sockets';
import { Content } from '../../constant/text';

const SocketBoxComponent = props => {
  StartSocketListener(props);

  const ConnectionLinkBox = () => (
    <a id={`${props.connection.toLowerCase()}-connection`} className='item'>
      <i className='fa fa-server fa-3x'/>
      <div>{props.connection.toUpperCase()}</div>
    </a>)

  return (
    <div className='ui raised segments'>
      <div className='ui segment box-title__div'><p>{Content.socketBoxComponentTitle}</p></div>
      <div className='ui secondary segment box-content__div'>{ConnectionLinkBox()}</div>
    </div>);
}

export default SocketBoxComponent;