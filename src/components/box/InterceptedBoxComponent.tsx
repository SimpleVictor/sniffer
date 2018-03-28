import * as React from 'react';

const InterceptedBoxComponent = () => (
  <div className='ui raised segments'>
    <div className='ui segment box-title__div'>
      <p>Intercepted</p>
    </div>
    <div className='ui secondary segment box-content__div box-content__div--intercepted'>
      <p id='intercepted-counter' className='box-content__p intercepted-counter__p'>0</p>
    </div>
  </div>);

export default InterceptedBoxComponent;

