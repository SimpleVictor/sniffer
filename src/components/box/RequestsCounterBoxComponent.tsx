import * as React from 'react';
import { Component } from 'react';
import { setUpOdometer } from '../../utils/common';
import { Content } from '../../constant/text';

class RequestCounterBoxComponent extends Component {
  constructor(public props) {
    super(props)
  }

  private SetUpNumberCounter = () => setUpOdometer(['request-counter', 'intercepted-counter'])

  componentDidMount() {
    this.SetUpNumberCounter()}

  render() {
    return (
      <div className='ui raised segments'>
        <div className='ui segment box-title__div'><p>{Content.requestsCounterBoxComponentTitle}</p></div>
        <div className='ui secondary segment box-content__div box-content__div--request'>
          <p id='request-counter' className='box-content__p request-counter__p'>0</p>
        </div>
      </div>
    )}
}

export default RequestCounterBoxComponent
