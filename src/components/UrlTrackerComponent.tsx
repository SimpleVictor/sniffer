import * as React from 'react';
import { getSocket } from '../utils/sockets';
import {
  CreateMockIMAGERequestObject,
  CreateMockJSONRequestObject,
  CreateNewTotalRequestObject,
  EmitGlobalErrorMessage,
  getFilterList,
  isImage,
  isValidJSON,
  openToast,
  removeExtraJSONCharacters,
  wasRequestIntercepted
} from '../utils/common';

const  UrlTrackerComponent = props => (
  <div id='scrollable-content' className='urltracker__div'>
    {GenerateRecordedRequestList(props)}
  </div>
);

export default UrlTrackerComponent;

function GenerateRecordedRequestList(props) {
  return(<div className='ui middle aligned divided list'>{RecordedRequestList(props)}</div>)
}

function GenerateRequestMethodLabel(request) {
  return (<div className='ui horizontal label request-method-label'>{request.method.toUpperCase()}</div>)
}

function GenerateRecordedListSubHeader(request) {
  return (<span className='request-content-type__span'>{GenerateStatusCode(request)} | {GenerateContentType(request)}</span>)
}

function GenerateStatusCode(request) {
  return (<span>{request.response.status_code}</span>)
}

function GenerateContentType(request) {
  return (<span>{request.contentType}</span>)
}

function ProceedToUpdateJSONRequest(recordedRequest, savedRequests, groupInView) {
  const requestObjToBeAdded = CreateMockJSONRequestObject(recordedRequest);
  const TotalRequestObject = CreateNewTotalRequestObject(requestObjToBeAdded, savedRequests, groupInView);
  openToast(`Successfully added a new collection to ${savedRequests[groupInView].group}`)
  getSocket().emit('SetSavedRequests', JSON.stringify(TotalRequestObject));
}

function ProceedToUpdateIMAGERequest(recordedRequest, savedRequests, groupInView) {
  const requestObjToBeAdded = CreateMockIMAGERequestObject(recordedRequest);
  const TotalRequestObject = CreateNewTotalRequestObject(requestObjToBeAdded, savedRequests, groupInView);
  openToast(`Successfully added a new image collection to ${savedRequests[groupInView].group}`)
  getSocket().emit('SetSavedRequests', JSON.stringify(TotalRequestObject));
}

function RecordedRequestList(props) {
  return props.recordedRequest
    .filter(response => filterOutResponsesBasedOnContentType(props, response))
    .filter(response => filterOutResponsesBasedOnInputField(props, response))
    .map((request, idx) => (
      <div className='item url-tracker-request-item__div' key={`requestItem${idx + 1}`}>
        {GenerateRecordedListActionsButton(request, props)}
        {GenerateRequestMethodLabel(request)}
        {GenerateRecordedListSubHeader(request)}
        {RenderUrlPath(request)}
      </div>
    ))
}

function RenderUrlPath(request) {
  return(
    <div className={`recorded-request-url__div ${wasRequestIntercepted(request) ? `recorded-request-url__div--green` : `recorded-request-url__div--blue`}`}>{
      request.rawUrl.pathname}
    </div>
  )
}

function GenerateRecordedListActionsButton(request, props) {
  return (
    <div className='right floated content'>
      <span className='url-tracker-add__span' onClick={() => addRecordedRequestToCurrentGroup(request, props)}>
        <i className='fa fa-plus fa-xs'/>
      </span>
    </div>
  )
}

function addRecordedRequestToCurrentGroup(recordedRequest, props) {
  const {
    savedRequests,
    groupInView,
    UniversalErrorMessageModalAction
  } = props;
  if (isImage(recordedRequest.contentType)) { /* CHECK IF CONTENT IS AN IMAGE */
    ProceedToUpdateIMAGERequest(recordedRequest, savedRequests, groupInView);
  } else if (isValidJSON(removeExtraJSONCharacters(recordedRequest.body))) { /* CHECK IF CONTENT IS A JSON */
    ProceedToUpdateJSONRequest(recordedRequest, savedRequests, groupInView)
  } else {
    EmitGlobalErrorMessage(
      'Currently we only support JSON files at the moment. Sorry!',
      UniversalErrorMessageModalAction
    );
  }
}

function filterOutResponsesBasedOnContentType(props, response) {
  const { currentFilter } = props;
  if(response.contentType) {
    return currentFilter === 'all'
      ? true
      : getFilterList()[currentFilter].indexOf(response.contentType.split(';')[0]) >= 0;
  }else {
    return true;
  }
}

function filterOutResponsesBasedOnInputField(props, repsonse) {
  return repsonse.rawUrl.pathname.indexOf(props.filterResponseInputValue) > 0 || props.filterResponseInputValue === '';
}