import * as React from 'react';
import FilterResponsesContentType from '../FilterResponsesContentType';
import UrlTrackerComponent from '../UrlTrackerComponent';
import BoxLoadingComponent from '../BoxLoadingComponent';
import FilterResponsesInput from '../FilterResponsesInput';

const RequestLogBoxComponent = props => (
  <div className="ui raised segments">
    <div className="ui segment box-title__div">
      <p>Recorded Requests Log</p>
    </div>
    <div className="ui secondary segment box-content__div box-content__div--padding">
      <FilterResponsesContentType
        EmptyRecordedRequestsAction={props.EmptyRecordedRequestsAction}
        ResponseFiltersAction={props.ResponseFiltersAction}
        currentFilter={props.currentFilter}/>

      <FilterResponsesInput
        FilterResponseInputAction={props.FilterResponseInputAction}/>

      <UrlTrackerComponent
        filterResponseInputValue={props.filterResponseInputValue}
        UniversalErrorMessageModalAction={props.UniversalErrorMessageModalAction}
        universalErrorMessage={props.universalErrorMessage}
        currentFilter={props.currentFilter}
        recordedRequest={props.recordedRequest}
        savedRequests={props.savedRequests}
        groupInView={props.groupInView}
        requestInView={props.requestInView}/>

      {!props.recordedRequest.length ? <BoxLoadingComponent/> : ''}

    </div>
  </div>
);

export default RequestLogBoxComponent;

