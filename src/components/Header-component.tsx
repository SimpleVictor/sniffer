import * as React from 'react';
import { Link } from 'react-router-dom';
import { getSocket } from '../utils/sockets';

const HeaderComponent = props => {
  StartSocketListener(props);
  return (
    <div className="ui left demo vertical inverted sidebar labeled icon menu visible">
      {ConnectionLinkBox(props)}
      <HomeLinkBox/>
      <SavedLinkBox/>
    </div>
  );
}

export default HeaderComponent;

function ConnectionLinkBox(props) {
  return(
    <a id={`${props.connection.toLowerCase()}-connection`} className="item">
      <i className="fa fa-server fa-3x"/>
      <div>{props.connection.toUpperCase()}</div>
    </a>
  )
}

function HomeLinkBox() {
  return(
    <Link to="/" className="item">
      <i className="fa fa-home fa-3x"/>
      <div>Home</div>
    </Link>
  )
}

function SavedLinkBox() {
  return (
    <Link to="/about-us" className="item">
      <i className="fa fa-database fa-3x"/>
      <div>Saved</div>
    </Link>
  )
}

//TODO move socket listener to a different file
function StartSocketListener(props) {
  getSocket().on('connected', () => props.SocketConnectAction('on'));
  getSocket().on('disconnect', () => props.SocketDisconnectAction('off'));
}

