import * as React from 'react';

const About = () => (
  <div className='container'>
    <div className='row'>
      <div className='twelve columns title'>Title</div>
    </div>

    <div className='row sector'>
      <div className='six columns first'>0 Intercepted</div>
      <div className='six columns second'>0 Requests</div>
    </div>

    <div className='row sector'>
      <div className='three columns'>Socket</div>
      <div className='three columns'>Proxy</div>
      <div className='three columns'>0 Collections</div>
      <div className='three columns'>0 Mocks</div>
    </div>

    <div className='row sector'>
      <div className='six columns big'>Current Group Selected</div>
      <div className='six columns big'>Request Log</div>
    </div>
  </div>
);

export default About;
