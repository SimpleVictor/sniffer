import * as React from 'react';
import { bulbClicked, counterObj } from '../utils/common';


const SpinnerComponent = props => {
  /* TODO find a way to remove this horrible hack around */
  if(counterObj.amountBulbWasClicked >= 1 && !props.spinner) {
    bulbClicked()
  }
  counterObj.amountBulbWasClicked += 1;

  return (
    <div id='main-spinner' className={`ui segment ${props.spinner ? '' : 'hide'}`}>
      <div className={`ui ${props.spinner ? 'active' : 'disabled'} dimmer`}>
        <div className='ui massive text loader'>Loading</div>
      </div>
    </div>
  )
}

export default SpinnerComponent;

