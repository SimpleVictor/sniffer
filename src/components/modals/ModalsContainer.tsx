import * as React from 'react'
import EditModalComponent from '../EditModalComponent';
import DeleteModalComponent from '../DeleteModalComponent';
import ErrorModalComponent from '../ErrorModal.component';
import JsonEditorModal from '../JsonEditorModal';
import ProxyIsOnModal from './ProxyIsOnModal';
import DeleteGroupModal from './DeleteGroupModal';
import AddHeaderModal from './AddHeaderModal';
import ImageModal from './ImageModal';

const ModalsContainer = props => (
  <section>
    <EditModalComponent
      ErrorMessageEditModalAction={props.ErrorMessageEditModalAction}
      editModalErrorMessage={props.editModalErrorMessage}
      individualRequest={props.individualRequest}
      savedRequests={props.savedRequests}
      groupInView={props.groupInView}
      requestInView={props.requestInView}/>

    {/* TODO Change allRequest to savedRequests*/}
    <DeleteModalComponent
      RequestInViewAction={props.RequestInViewAction}
      allRequest={props.savedRequests}
      groupInView={props.groupInView}
      requestInView={props.requestInView}/>

    <ErrorModalComponent
      UniversalErrorMessageModalAction={props.UniversalErrorMessageModalAction}
      universalErrorMessage={props.universalErrorMessage}/>

    <JsonEditorModal
      ErrorMessageEditModalAction={props.ErrorMessageEditModalAction}
      ToggleEditModalAction={props.ToggleEditModalAction}
      savedRequests={props.savedRequests}
      groupInView={props.groupInView}
      requestInView={props.requestInView}/>

    <AddHeaderModal/>

    <ImageModal
      savedRequests={props.savedRequests}
      groupInView={props.groupInView}
      requestInView={props.requestInView}/>


    <DeleteGroupModal
      savedRequests={props.savedRequests}
      groupInView={props.groupInView}
      requestInView={props.requestInView}
      GroupsInViewAction={props.GroupsInViewAction}/>

    <ProxyIsOnModal/>

  </section>
)

export default ModalsContainer