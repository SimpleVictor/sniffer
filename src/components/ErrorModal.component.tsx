import * as React from 'react';
import {
  isThereAnyGlobalErrorMessages,
  showErrorModal
} from '../utils/common';

class ErrorModalComponent extends React.Component {
  constructor(public props: any) {
    super(props);
  }

  componentDidUpdate() {
    const {
      universalErrorMessage,
      UniversalErrorMessageModalAction
    } = this.props;
    isThereAnyGlobalErrorMessages(universalErrorMessage) ? showErrorModal(UniversalErrorMessageModalAction) : '';
  }

  render() {
    return (
      <div id='error-modal' className='ui modal'>
        <div className='header'>Error!</div>
        <div className='content error-modal-message'>{this.props.universalErrorMessage}</div>
      </div>
    )
  }
}

export default ErrorModalComponent;


