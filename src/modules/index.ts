import { combineReducers } from 'redux';
import { routerReducer } from 'react-router-redux';
import {
  ConnectionReducer,
  CurrentIndividualRequestReducer,
  CurrentRequestReducer,
  ErrorMessageEditModalReducer,
  FilterResponseInputReducer,
  GroupInViewReducer,
  RecordedRequestsReducer,
  RequestInViewReducer,
  ResponseFilterReducer,
  SavedRequestsReducer,
  ToggleEditModalReducer,
  ToggleProxyReducer,
  ToggleSpinnerReducer,
  UniversalErrorMessageModalReducer
} from './reducers';

export default combineReducers({
  editModal: ToggleEditModalReducer,
  savedRequests: SavedRequestsReducer,
  currentRequest: CurrentRequestReducer,
  individualRequest: CurrentIndividualRequestReducer,
  router: routerReducer,
  connection: ConnectionReducer,
  requestInView: RequestInViewReducer,
  groupInView: GroupInViewReducer,
  proxy: ToggleProxyReducer,
  spinner: ToggleSpinnerReducer,
  recordedRequest: RecordedRequestsReducer,
  filter: ResponseFilterReducer,
  editModalErrorMessage: ErrorMessageEditModalReducer,
  universalErrorMessageModal: UniversalErrorMessageModalReducer,
  filterResponseInputValue: FilterResponseInputReducer
});
