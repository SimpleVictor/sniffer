import * as React from 'react'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import { Component } from 'react'
import SocketBoxComponent from '../../components/box/SocketBoxComponent'
import ProxyBoxComponent from '../../components/box/ProxyBoxComponent'
import CollectionBoxComponent from '../../components/box/CollectionBoxComponent';
import GroupsBoxComponent from '../../components/box/GroupsBoxComponent'
import InterceptedBoxComponent from '../../components/box/InterceptedBoxComponent'
import GroupSelectionBoxComponent from '../../components/box/GroupSelectionBox'
import RequestLogBoxComponent from '../../components/box/RequestLogBoxComponent'
import RequestCounterBoxComponent from '../../components/box/RequestsCounterBoxComponent'
import DogComponent from '../../components/DogComponent'
import ModalsContainer from '../../components/modals/ModalsContainer';
import { getSocket } from '../../utils/sockets';
import { SnifferProperties } from '../../constant/properties';
import {
  AddGroupAction,
  EmptyRecordedRequestsAction,
  ErrorMessageEditModalAction,
  FilterResponseInputAction,
  GroupsInViewAction,
  ReceivedSavedRequestAction,
  RecordedRequestsAction,
  RequestInViewAction,
  ResponseFiltersAction,
  SetCurrentRequestAction,
  SetIndividualRequestAction,
  SocketConnectAction,
  SocketDisconnectAction,
  ToggleEditModalAction,
  ToggleProxyAction,
  ToggleSpinnerAction,
  UniversalErrorMessageModalAction,
  UpdatedSavedRequestAction, SetGlobalHeadersAction
} from '../../modules/actions'
import {
  counterObj,
  GetDOMElement,
  GetSavedRequests,
  wasRequestIntercepted,
  GetGlobalHeaders
} from '../../utils/common'

class Home extends Component {
  constructor(public props: any) {
    super(props)
    GetSavedRequests()
    GetGlobalHeaders()
    const socket = getSocket();
    socket.on(SnifferProperties.SocketOnReceivedSavedRequests, this.onReceivedSavedRequests.bind(this));
    socket.on(SnifferProperties.SocketProxyStatus, this.onProxyStatus.bind(this));
    socket.on(SnifferProperties.SocketReceivedStatus, this.onReceivedRequest.bind(this));
    socket.on(SnifferProperties.OnAddGroupUpdate, this.onAddGroupUpdate.bind(this));
    socket.on(SnifferProperties.SocketOnReceivedGlobalHeaders, this.onReceivedGlobalHeaders.bind(this))
    socket.on(SnifferProperties.onPrint, this.onPrint.bind(this))
  }

  private onPrint = data => console.log(data)

  private onReceivedGlobalHeaders = data => {
    this.props.SetGlobalHeadersAction(data);
  }

  private onAddGroupUpdate = data => {
    this.props.ReceivedSavedRequestAction(data)
    /* Update Group in View to the last group since we're adding it at the bottom of the list*/
    /* TODO EDGE CASE: when there isn't any group in general and the user tries to add a group,  `this.props.groupInView + 1` will be undefined because only 1 group exists after it gets created */
    this.props.GroupsInViewAction(this.props.savedRequests.length - 1);
    this.props.RequestInViewAction(null)} /* Reset Request in View to null */

  private onReceivedRequest = request => {
    console.log(request);
    this.props.RecordedRequestsAction(request)
    counterObj.requestCounter += 1
    GetDOMElement('request-counter').innerText = counterObj.requestCounter + ''
    if(wasRequestIntercepted(request)) {
      counterObj.interceptedCounter += 1
      GetDOMElement('intercepted-counter').innerText = counterObj.interceptedCounter + ''
    }}

  private onProxyStatus = () => this.props.ToggleSpinnerAction()

  private onReceivedSavedRequests = data => {
    this.props.ReceivedSavedRequestAction(data)
    const currentGroup = this.props.groupInView
    if (data[currentGroup]) {
      this.props.SetCurrentRequestAction(data[currentGroup])
    } else {
      this.props.SetCurrentRequestAction(null)
    }
  }

  private renderFirstRow = () => (<div className='twelve columns title'><DogComponent/></div>)

  private renderSecondRow = props => (
    <section>
      <div className='six columns'>{this.renderSocketBoxComponent(props)}</div>
      <div className='six columns'>{this.renderProxyBoxComponent(props)}</div>
    </section>)

  private renderThirdRow = props => (
    <section>
      <div className='three columns'><InterceptedBoxComponent/></div>
      <div className='three columns'><RequestCounterBoxComponent/></div>
      <div className='three columns'><GroupsBoxComponent savedRequests={props.savedRequests}/></div>
      <div className='three columns'><CollectionBoxComponent savedRequests={props.savedRequests}/></div>
    </section>)

  private renderFourthRow = props => (
    <section>
      <div className='six columns'>{this.renderGroupSelectionBoxComponent(props)}</div>
      <div className='six columns'>{this.renderRequestLogBoxComponent(props)}</div>
    </section>)

  private renderProxyBoxComponent = props => (<ProxyBoxComponent store={props}/>)

  private renderRequestLogBoxComponent = props => (
    <RequestLogBoxComponent
      filterResponseInputValue={props.filterResponseInputValue}
      FilterResponseInputAction={props.FilterResponseInputAction}
      EmptyRecordedRequestsAction={props.EmptyRecordedRequestsAction}
      ResponseFiltersAction={props.ResponseFiltersAction}
      currentFilter={props.currentFilter}
      UniversalErrorMessageModalAction={props.UniversalErrorMessageModalAction}
      universalErrorMessage={props.universalErrorMessage}
      recordedRequest={props.recordedRequest}
      savedRequests={props.savedRequests}
      groupInView={props.groupInView}
      requestInView={props.requestInView}
    />)

  private renderGroupSelectionBoxComponent = props => (
    <GroupSelectionBoxComponent
      store={props}
      SetGlobalHeadersAction={props.SetGlobalHeadersAction}
      globalHeaders={props.globalHeaders}
      proxy={props.proxy}
      savedRequests={props.savedRequests}
      RequestInViewAction={props.RequestInViewAction}
      GroupsInViewAction={props.GroupsInViewAction}
      AddGroupAction={props.AddGroupAction}
      groupInView={props.groupInView}
    />)

  private renderSocketBoxComponent = props => (
    <SocketBoxComponent
      router={props.router}
      connection={props.connection}
      SocketConnectAction={props.SocketConnectAction}
      SocketDisconnectAction={props.SocketDisconnectAction}
    />)

  private renderModalContainer = props => (
    <ModalsContainer
      GroupsInViewAction={props.GroupsInViewAction}
      ErrorMessageEditModalAction={props.ErrorMessageEditModalAction}
      editModalErrorMessage={props.editModalErrorMessage}
      individualRequest={props.individualRequest}
      savedRequests={props.savedRequests}
      groupInView={props.groupInView}
      requestInView={props.requestInView}
      RequestInViewAction={props.RequestInViewAction}
      allRequest={props.savedRequests}
      UniversalErrorMessageModalAction={props.UniversalErrorMessageModalAction}
      universalErrorMessage={props.universalErrorMessage}
      ToggleEditModalAction={props.ToggleEditModalAction}
    />)

  render() {
    return (
      <div className='home-container__div'>
        <div className='container mitm-container'>
          <div className='row sector'>{this.renderFirstRow()}</div>
          <div className='row sector'>{this.renderSecondRow(this.props)}</div>
          <div className='row sector'>{this.renderThirdRow(this.props)}</div>
          <div className='row sector'>{this.renderFourthRow(this.props)}</div>
        </div>
        {this.renderModalContainer(this.props)}
      </div>
    )}
}

const mapStateToProps = state => ({
  editModalErrorMessage: state.editModalErrorMessage,
  currentFilter: state.filter,
  savedRequests: state.savedRequests,
  currentRequest: state.currentRequest,
  individualRequest: state.individualRequest,
  requestInView: state.requestInView,
  groupInView: state.groupInView,
  proxy: state.proxy,
  recordedRequest: state.recordedRequest,
  universalErrorMessage: state.universalErrorMessageModal,
  connection: state.connection,
  router: state.router,
  filterResponseInputValue: state.filterResponseInputValue,
  globalHeaders: state.globalHeaders
})

const mapDispatchToProps = dispatch => bindActionCreators({
  SetGlobalHeadersAction,
  EmptyRecordedRequestsAction,
  SocketDisconnectAction,
  SocketConnectAction,
  ResponseFiltersAction,
  UpdatedSavedRequestAction,
  UniversalErrorMessageModalAction,
  ErrorMessageEditModalAction,
  ToggleEditModalAction,
  RecordedRequestsAction,
  ReceivedSavedRequestAction,
  SetCurrentRequestAction,
  SetIndividualRequestAction,
  RequestInViewAction,
  ToggleProxyAction,
  ToggleSpinnerAction,
  GroupsInViewAction,
  AddGroupAction,
  FilterResponseInputAction
}, dispatch)

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Home)
