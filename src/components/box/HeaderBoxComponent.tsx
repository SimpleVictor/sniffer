import * as React from 'react';

const HeaderBoxComponent = props => (
  <div className="ui raised segment content box-content__div">
    <img className="c1-tech-logo__img2" src={process.env.PUBLIC_URL + '/images/c1tech.png'} alt="logo" />
    <p>Sniffer</p>
  </div>
);

export default HeaderBoxComponent;

