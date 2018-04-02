import * as React from 'react'
import RequestsDropDown from '../RequestsDropDown'
import GroupSelectorAddSection from '../GroupSelectionAddSection'
import GlobalHeadersComponent from "../GlobalHeadersComponent";
import { CSSConstant } from '../../constant/cssNames';
import {
  determineContentType,
  isImage,
  ModalConstantID,
  openModal
} from '../../utils/common'

const GroupSelectionBoxComponent = props => {

  const updateRequestInView = idx => props.RequestInViewAction(idx)

  const openModalDependingOnContentType = (contentType) => {
    /* BY DEFAULT WE ONLY HAVE JSON AND IMAGES */
    if (isImage(contentType)) {
      openModal(`#${ModalConstantID.imageModal}`);
    }else {
      openModal('#json-editor-modal')
    }
  }

  const renderGroupSelectorAddSection = () => (
    <GroupSelectorAddSection
      proxy={props.proxy}
      groupInView={props.groupInView}
      savedRequests={props.savedRequests}/>)

  const groupUrlListClicked = (props, idx) => {
    if (props.proxy === 'off') {
      updateRequestInView(idx)
      const contentType = determineContentType(props.groupInView, props.savedRequests, idx)
      openModalDependingOnContentType(contentType)
    } else {
      openModal(`#${CSSConstant.proxyIsOnModalID}`);
    }
  }

  const renderNoSavedRequestTag = () =>
    (<h3 className='group-selection-no-data__h3'>You have no requests saved in thiss group</h3>)

  const NoDataMessage = group =>
    (group && !group.data.length) ? renderNoSavedRequestTag() : ''

  const renderSavedResponseContainer = (currentGroup, props) => (
    <div className='group-selection-box__div--test'>
      <div className='ui left aligned divided list'>
        {currentGroup ? renderSavedResponseList(currentGroup, props) : ''}
      </div>
    </div>)

  const renderSavedResponseList = (currentGroup, props) => currentGroup.data.map((individualRequest, idx) => (
    <div
      className='item group-selection-box-item__div'
      key={individualRequest.urlToMatch + idx}
      onClick={() => groupUrlListClicked(props, idx)}>
      <div className='group-selection-box-url-name__div'>
        <i className='fa fa-angle-right fa-2x group-selection-right-angle__i'/>
        <span className='group-selection-box-url__span'>{individualRequest.urlToMatch}</span>
      </div>
    </div>))

  const SomethingExtra = () => ( /* TODO something extra I'm doing */
    <section>
      <p>Group Selection</p>
      {/* TODO add the subclass activity inside of this icon*/}
      { false ? (<RenderGroupSelectionDropdown/>) : ''}
    </section>)

  const renderRequestsDropDown = props => (
    <RequestsDropDown
      proxy={props.proxy}
      savedRequests={props.savedRequests}
      RequestInViewAction={props.RequestInViewAction}
      GroupsInViewAction={props.GroupsInViewAction}
      groupInView={props.groupInView}/>)


  const deleteGroupButtonClicked = props =>
    props.proxy === 'off' ? openModal('#delete-group-modal') : openModal(`#${CSSConstant.proxyIsOnModalID}`)

  const renderDeleteGroupButton = props => (
    <a
      onClick={() => deleteGroupButtonClicked(props)}
      className='group-selection-delete-group__anchor'>Delete Group</a>)

  const renderCurrentGroup = props => {
    if(props.savedRequests.length && props.groupInView >= 0) {
      return (
        <div className="group-selection-current-group__div">
          <span className="group-selection-current-group-text__span">Current Group: </span>
          <span className="group-selection-current-group-dynamic-text__span">{props.savedRequests[props.groupInView].group}</span>
        </div>
      );
    }
    return '';
  }

  return (
    <div className='ui raised segments'>
      <div className='ui segment box-title__div'>
        <SomethingExtra/>
      </div>
      <div className='ui secondary segment box-content__div'>
        {renderGroupSelectorAddSection()}
        <GlobalHeadersComponent
            proxy={props.proxy}/>
        {renderDeleteGroupButton(props)}
        {renderRequestsDropDown(props)}
        {renderCurrentGroup(props)}
        <br/>
        {NoDataMessage(props.store.savedRequests[props.store.groupInView])}
        {renderSavedResponseContainer(props.store.savedRequests[props.store.groupInView], props)}
      </div>
    </div>
  )
}

export default GroupSelectionBoxComponent


//TODO Add options to update/add here
function RenderGroupSelectionDropdown() {
  return(
    <div className='ui icon top left pointing dropdown button group-selection-drop-down'>
      <i className='fa fa-wrench fa-xs'></i >
      <div className='menu'>
        <div className='header'>Display Density</div>
        <div className='item'>Comfortable</div>
        <div className='item'>Cozy</div>
        <div className='item'>Compact</div>
        <div className='ui divider'></div>
        <div className='item'>Settings</div>
        <div className='item'>
          <i className='fa fa-chevron-down fa-xs'></i>
          <span className='text'>Upload Settings</span>
          <div className='menu'>
            <div className='item'>
              <i className='fa fa-chevron-down fa-xs'></i>
              Convert Uploaded Files to PDF
            </div>
            <div className='item'>
              <i className='fa fa-chevron-down fa-xs'></i>
              Digitize Text from Uploaded Files
            </div>
          </div>
        </div>
        <div className='item'>Manage Apps</div>
        <div className='item'>Keyboard Shortcuts</div>
        <div className='item'>Help</div>
      </div>
    </div>
  )
}

